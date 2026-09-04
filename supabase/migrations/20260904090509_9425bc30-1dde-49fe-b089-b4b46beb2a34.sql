-- ============ Marketplace 2.0 ============
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.listing_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  version integer NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, version)
);
GRANT SELECT ON public.listing_versions TO anon, authenticated;
GRANT ALL ON public.listing_versions TO service_role;
ALTER TABLE public.listing_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_versions_public_read" ON public.listing_versions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.listing_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.listing_favorites TO authenticated;
GRANT ALL ON public.listing_favorites TO service_role;
ALTER TABLE public.listing_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_favorites_own" ON public.listing_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_listing_view(_listing_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.marketplace_listings SET views = views + 1 WHERE id = _listing_id AND published = true;
$$;

-- ============ Payouts ============
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  method text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text NOT NULL DEFAULT '',
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_requests_own_read" ON public.payout_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.request_payout(_user_id uuid, _amount integer, _method text, _destination text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _balance integer; _id uuid;
BEGIN
  IF _amount < 10 THEN RETURN jsonb_build_object('ok', false, 'error', 'Minimum payout is $10.'); END IF;
  SELECT balance INTO _balance FROM public.user_balances WHERE user_id = _user_id FOR UPDATE;
  IF _balance IS NULL OR _balance < _amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not enough balance.');
  END IF;
  UPDATE public.user_balances SET balance = balance - _amount, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.payout_requests (user_id, amount, method, destination)
  VALUES (_user_id, _amount, _method, _destination) RETURNING id INTO _id;
  INSERT INTO public.balance_adjustments (user_id, amount, reason)
  VALUES (_user_id, -_amount, 'Payout request');
  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_payout(_admin_id uuid, _payout_id uuid, _approve boolean, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.payout_requests;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;
  SELECT * INTO _row FROM public.payout_requests WHERE id = _payout_id FOR UPDATE;
  IF _row IS NULL OR _row.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payout is not pending.');
  END IF;
  IF _approve THEN
    UPDATE public.payout_requests SET status = 'paid', note = COALESCE(_note, ''), processed_by = _admin_id, processed_at = now() WHERE id = _payout_id;
  ELSE
    UPDATE public.payout_requests SET status = 'rejected', note = COALESCE(_note, ''), processed_by = _admin_id, processed_at = now() WHERE id = _payout_id;
    INSERT INTO public.user_balances (user_id, balance) VALUES (_row.user_id, _row.amount)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + _row.amount, updated_at = now();
    INSERT INTO public.balance_adjustments (user_id, amount, reason) VALUES (_row.user_id, _row.amount, 'Payout rejected — refund');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============ Referrals ============
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_codes_own_read" ON public.referral_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reward_amount integer NOT NULL DEFAULT 0,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_own_read" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_public_read" ON public.app_settings FOR SELECT USING (true);

INSERT INTO public.app_settings (key, value) VALUES
  ('referral', '{"referrerBonus": 200, "refereeBonus": 100, "minSpend": 100}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.attach_referral(_user_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _referrer uuid; _bonus integer;
BEGIN
  SELECT user_id INTO _referrer FROM public.referral_codes WHERE upper(code) = upper(_code);
  IF _referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Unknown referral code.'); END IF;
  IF _referrer = _user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'You cannot refer yourself.'); END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This account already used a referral code.');
  END IF;
  SELECT COALESCE((value->>'refereeBonus')::int, 0) INTO _bonus FROM public.app_settings WHERE key = 'referral';
  INSERT INTO public.referrals (referrer_id, referred_id, code) VALUES (_referrer, _user_id, upper(_code));
  IF _bonus > 0 THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (_user_id, _bonus)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + _bonus, updated_at = now();
    INSERT INTO public.balance_adjustments (user_id, amount, reason) VALUES (_user_id, _bonus, 'Referral welcome bonus');
  END IF;
  RETURN jsonb_build_object('ok', true, 'bonus', _bonus);
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_referral(_user_id uuid, _spent integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ref public.referrals; _bonus integer; _min integer;
BEGIN
  SELECT * INTO _ref FROM public.referrals WHERE referred_id = _user_id AND status = 'pending' FOR UPDATE;
  IF _ref IS NULL THEN RETURN; END IF;
  SELECT COALESCE((value->>'referrerBonus')::int, 0), COALESCE((value->>'minSpend')::int, 0)
    INTO _bonus, _min FROM public.app_settings WHERE key = 'referral';
  IF _spent < _min THEN RETURN; END IF;
  UPDATE public.referrals SET status = 'rewarded', reward_amount = _bonus, rewarded_at = now() WHERE id = _ref.id;
  IF _bonus > 0 THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (_ref.referrer_id, _bonus)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + _bonus, updated_at = now();
    INSERT INTO public.balance_adjustments (user_id, amount, reason) VALUES (_ref.referrer_id, _bonus, 'Referral reward');
    INSERT INTO public.user_notifications (user_id, kind, title, body, href)
    VALUES (_ref.referrer_id, 'referral', 'Referral reward earned', 'Someone you invited made their first purchase.', '/referrals');
  END IF;
END;
$$;

-- ============ Email 2FA ============
CREATE TABLE IF NOT EXISTS public.user_2fa (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT false,
  backup_codes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_2fa TO authenticated;
GRANT ALL ON public.user_2fa TO service_role;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_2fa_own_read" ON public.user_2fa FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.email_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_otp_codes TO service_role;
ALTER TABLE public.email_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS email_otp_codes_user_idx ON public.email_otp_codes (user_id, created_at DESC);