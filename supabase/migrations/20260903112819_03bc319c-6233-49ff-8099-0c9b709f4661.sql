
-- BALANCE ------------------------------------------------------------------
CREATE TABLE public.user_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_balances TO authenticated;
GRANT ALL ON public.user_balances TO service_role;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own balance readable" ON public.user_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.balance_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount > 0),
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.balance_codes TO service_role;
ALTER TABLE public.balance_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.balance_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.balance_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT ON public.balance_code_redemptions TO authenticated;
GRANT ALL ON public.balance_code_redemptions TO service_role;
ALTER TABLE public.balance_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own balance redemptions readable" ON public.balance_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- MARKETPLACE ---------------------------------------------------------------
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_bot_id text,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  bot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  flow_data jsonb,
  sales_count integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published listings readable" ON public.marketplace_listings FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "sellers manage own listings" ON public.marketplace_listings FOR ALL TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

CREATE TABLE public.marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price integer NOT NULL,
  bot_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);
GRANT SELECT ON public.marketplace_purchases TO authenticated;
GRANT ALL ON public.marketplace_purchases TO service_role;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchases readable" ON public.marketplace_purchases FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

CREATE TRIGGER touch_marketplace_listings BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FUNCTIONS -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_balance_code(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.balance_codes%ROWTYPE; new_balance integer;
BEGIN
  SELECT * INTO c FROM public.balance_codes WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid code.'); END IF;
  IF NOT c.active THEN RETURN jsonb_build_object('ok', false, 'error', 'This code is no longer active.'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'error', 'This code has expired.'); END IF;
  IF c.used_count >= c.max_uses THEN RETURN jsonb_build_object('ok', false, 'error', 'This code has already been used.'); END IF;
  IF EXISTS (SELECT 1 FROM public.balance_code_redemptions WHERE code_id = c.id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already redeemed this code.');
  END IF;

  INSERT INTO public.balance_code_redemptions (code_id, user_id, amount) VALUES (c.id, _user_id, c.amount);
  UPDATE public.balance_codes SET used_count = used_count + 1 WHERE id = c.id;

  INSERT INTO public.user_balances (user_id, balance) VALUES (_user_id, c.amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + EXCLUDED.balance, updated_at = now()
  RETURNING balance INTO new_balance;

  RETURN jsonb_build_object('ok', true, 'amount', c.amount, 'balance', new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_listing(_user_id uuid, _listing_id uuid, _bot_id text, _bot_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE l public.marketplace_listings%ROWTYPE; bal integer; new_balance integer;
BEGIN
  SELECT * INTO l FROM public.marketplace_listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND OR NOT l.published THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not available.'); END IF;
  IF l.seller_id = _user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'You already own this bot.'); END IF;
  IF EXISTS (SELECT 1 FROM public.marketplace_purchases WHERE listing_id = l.id AND buyer_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already bought this bot.');
  END IF;

  INSERT INTO public.user_balances (user_id, balance) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal FROM public.user_balances WHERE user_id = _user_id FOR UPDATE;
  IF bal < l.price THEN RETURN jsonb_build_object('ok', false, 'error', 'Not enough balance.'); END IF;

  UPDATE public.user_balances SET balance = balance - l.price, updated_at = now() WHERE user_id = _user_id
  RETURNING balance INTO new_balance;

  IF l.price > 0 THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (l.seller_id, l.price)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + EXCLUDED.balance, updated_at = now();
  END IF;

  INSERT INTO public.marketplace_purchases (listing_id, buyer_id, price, bot_id)
  VALUES (l.id, _user_id, l.price, _bot_id);
  UPDATE public.marketplace_listings SET sales_count = sales_count + 1 WHERE id = l.id;

  INSERT INTO public.bots (id, user_id, name, data) VALUES (_bot_id, _user_id, l.title, _bot_data)
  ON CONFLICT (user_id, id) DO UPDATE SET data = EXCLUDED.data, name = EXCLUDED.name;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance, 'botId', _bot_id);
END;
$$;
