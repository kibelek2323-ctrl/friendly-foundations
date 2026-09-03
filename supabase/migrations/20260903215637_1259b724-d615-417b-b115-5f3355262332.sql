-- 1. Listing categories
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

CREATE INDEX IF NOT EXISTS marketplace_listings_category_idx ON public.marketplace_listings (category);

-- 2. Creator profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- 3. Listing reviews
CREATE TABLE IF NOT EXISTS public.listing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);

ALTER TABLE public.listing_reviews
  ADD CONSTRAINT listing_reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

GRANT SELECT ON public.listing_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reviews TO authenticated;
GRANT ALL ON public.listing_reviews TO service_role;

ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews are public" ON public.listing_reviews
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "buyers write own review" ON public.listing_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.marketplace_purchases p
      WHERE p.listing_id = listing_reviews.listing_id AND p.buyer_id = auth.uid()
    )
  );

CREATE POLICY "authors update own review" ON public.listing_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authors delete own review" ON public.listing_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "service role manages reviews" ON public.listing_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER listing_reviews_touch BEFORE UPDATE ON public.listing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS listing_reviews_listing_idx ON public.listing_reviews (listing_id);

-- 4. Percentage discount codes
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  percent integer NOT NULL,
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_percent_range CHECK (percent BETWEEN 1 AND 100);

CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_key ON public.discount_codes (upper(code));

GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages discount codes" ON public.discount_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER discount_codes_touch BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.discount_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  amount_saved integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discount_code_redemptions TO authenticated;
GRANT ALL ON public.discount_code_redemptions TO service_role;

ALTER TABLE public.discount_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own discount redemptions readable" ON public.discount_code_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "service role manages discount redemptions" ON public.discount_code_redemptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Quote a discount code for a listing (price maths stays in the database)
CREATE OR REPLACE FUNCTION public.quote_discount(_user_id uuid, _listing_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.discount_codes%ROWTYPE; l public.marketplace_listings%ROWTYPE; final_price integer;
BEGIN
  SELECT * INTO l FROM public.marketplace_listings WHERE id = _listing_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not available.'); END IF;

  SELECT * INTO c FROM public.discount_codes WHERE upper(code) = upper(btrim(_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid discount code.'); END IF;
  IF NOT c.active THEN RETURN jsonb_build_object('ok', false, 'error', 'This code is no longer active.'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'This code has expired.'); END IF;
  IF c.used_count >= c.max_uses THEN RETURN jsonb_build_object('ok', false, 'error', 'This code has been fully used.'); END IF;
  IF c.listing_id IS NOT NULL AND c.listing_id <> _listing_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This code does not apply to this bot.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.discount_code_redemptions WHERE code_id = c.id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already used this code.');
  END IF;

  final_price := greatest(0, l.price - ((l.price * c.percent) / 100));
  RETURN jsonb_build_object('ok', true, 'percent', c.percent, 'price', l.price, 'finalPrice', final_price);
END; $$;

REVOKE EXECUTE ON FUNCTION public.quote_discount(uuid, uuid, text) FROM public, anon, authenticated;

-- 6. Purchase with optional discount code
CREATE OR REPLACE FUNCTION public.purchase_listing_with_code(_user_id uuid, _listing_id uuid, _bot_id text, _bot_data jsonb, _code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.marketplace_listings%ROWTYPE;
  c public.discount_codes%ROWTYPE;
  bal integer;
  new_balance integer;
  final_price integer;
BEGIN
  SELECT * INTO l FROM public.marketplace_listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR NOT l.published THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not available.'); END IF;
  IF l.seller_id = _user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'You already own this bot.'); END IF;
  IF EXISTS (SELECT 1 FROM public.marketplace_purchases WHERE listing_id = l.id AND buyer_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already bought this bot.');
  END IF;

  final_price := l.price;

  IF _code IS NOT NULL AND btrim(_code) <> '' THEN
    SELECT * INTO c FROM public.discount_codes WHERE upper(code) = upper(btrim(_code)) FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid discount code.'); END IF;
    IF NOT c.active THEN RETURN jsonb_build_object('ok', false, 'error', 'This code is no longer active.'); END IF;
    IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'This code has expired.'); END IF;
    IF c.used_count >= c.max_uses THEN RETURN jsonb_build_object('ok', false, 'error', 'This code has been fully used.'); END IF;
    IF c.listing_id IS NOT NULL AND c.listing_id <> l.id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This code does not apply to this bot.');
    END IF;
    IF EXISTS (SELECT 1 FROM public.discount_code_redemptions WHERE code_id = c.id AND user_id = _user_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'You already used this code.');
    END IF;
    final_price := greatest(0, l.price - ((l.price * c.percent) / 100));
  END IF;

  INSERT INTO public.user_balances (user_id, balance) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal FROM public.user_balances WHERE user_id = _user_id FOR UPDATE;
  IF bal < final_price THEN RETURN jsonb_build_object('ok', false, 'error', 'Not enough balance.'); END IF;

  UPDATE public.user_balances SET balance = balance - final_price, updated_at = now() WHERE user_id = _user_id
  RETURNING balance INTO new_balance;

  IF final_price > 0 THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (l.seller_id, final_price)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + EXCLUDED.balance, updated_at = now();
  END IF;

  IF c.id IS NOT NULL THEN
    INSERT INTO public.discount_code_redemptions (code_id, user_id, listing_id, amount_saved)
    VALUES (c.id, _user_id, l.id, l.price - final_price);
    UPDATE public.discount_codes SET used_count = used_count + 1 WHERE id = c.id;
  END IF;

  INSERT INTO public.marketplace_purchases (listing_id, buyer_id, price, bot_id)
  VALUES (l.id, _user_id, final_price, _bot_id);
  UPDATE public.marketplace_listings SET sales_count = sales_count + 1 WHERE id = l.id;

  INSERT INTO public.bots (id, user_id, name, data) VALUES (_bot_id, _user_id, l.title, _bot_data)
  ON CONFLICT (user_id, id) DO UPDATE SET data = EXCLUDED.data, name = EXCLUDED.name;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance, 'botId', _bot_id, 'price', final_price);
END; $$;

REVOKE EXECUTE ON FUNCTION public.purchase_listing_with_code(uuid, uuid, text, jsonb, text) FROM public, anon, authenticated;