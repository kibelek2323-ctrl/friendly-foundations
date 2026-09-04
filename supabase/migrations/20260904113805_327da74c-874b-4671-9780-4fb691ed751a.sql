CREATE OR REPLACE FUNCTION public.purchase_listing(_user_id uuid, _listing_id uuid, _bot_id text, _bot_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.marketplace_listings%ROWTYPE; bal integer; new_balance integer; seller_amount integer;
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

  seller_amount := l.price - ((l.price * 10) / 100);
  IF seller_amount > 0 THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (l.seller_id, seller_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + EXCLUDED.balance, updated_at = now();
  END IF;

  INSERT INTO public.marketplace_purchases (listing_id, buyer_id, price, bot_id)
  VALUES (l.id, _user_id, l.price, _bot_id);
  UPDATE public.marketplace_listings SET sales_count = sales_count + 1 WHERE id = l.id;

  INSERT INTO public.bots (id, user_id, name, data) VALUES (_bot_id, _user_id, l.title, _bot_data)
  ON CONFLICT (user_id, id) DO UPDATE SET data = EXCLUDED.data, name = EXCLUDED.name;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance, 'botId', _bot_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_listing_with_code(_user_id uuid, _listing_id uuid, _bot_id text, _bot_data jsonb, _code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  l public.marketplace_listings%ROWTYPE;
  c public.discount_codes%ROWTYPE;
  bal integer;
  new_balance integer;
  final_price integer;
  seller_amount integer;
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

  seller_amount := final_price - ((final_price * 10) / 100);
  IF seller_amount > 0 THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (l.seller_id, seller_amount)
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
END; $function$;