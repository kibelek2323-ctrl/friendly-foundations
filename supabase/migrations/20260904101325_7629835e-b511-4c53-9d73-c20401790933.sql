CREATE TABLE public.crypto_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('topup','plan')),
  plan plan_tier,
  amount integer NOT NULL CHECK (amount > 0),
  order_id text NOT NULL UNIQUE,
  invoice_id text,
  payment_id text,
  pay_currency text,
  status text NOT NULL DEFAULT 'waiting',
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crypto_payments TO authenticated;
GRANT ALL ON public.crypto_payments TO service_role;

ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own crypto payments"
ON public.crypto_payments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER crypto_payments_touch
BEFORE UPDATE ON public.crypto_payments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX crypto_payments_user_idx ON public.crypto_payments (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.credit_crypto_payment(_order_id text, _payment_id text, _pay_currency text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE p public.crypto_payments%ROWTYPE; new_expires timestamptz;
BEGIN
  SELECT * INTO p FROM public.crypto_payments WHERE order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unknown order'); END IF;
  IF p.credited_at IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  UPDATE public.crypto_payments
  SET status = 'finished', credited_at = now(),
      payment_id = COALESCE(_payment_id, payment_id),
      pay_currency = COALESCE(_pay_currency, pay_currency)
  WHERE id = p.id;

  IF p.purpose = 'topup' THEN
    INSERT INTO public.user_balances (user_id, balance) VALUES (p.user_id, p.amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_balances.balance + EXCLUDED.balance, updated_at = now();

    INSERT INTO public.balance_adjustments (user_id, amount, reason)
    VALUES (p.user_id, p.amount, 'Crypto top-up');

    INSERT INTO public.user_notifications (user_id, kind, title, body, href, dedupe_key)
    VALUES (p.user_id, 'system', 'Top-up received',
      'Your crypto payment was confirmed and your balance was updated.', '/balance', 'crypto:' || p.order_id)
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  ELSE
    SELECT expires_at INTO new_expires FROM public.user_plans WHERE user_id = p.user_id;
    IF new_expires IS NULL OR new_expires < now() THEN new_expires := now(); END IF;
    new_expires := new_expires + interval '30 days';

    INSERT INTO public.user_plans (user_id, plan, expires_at)
    VALUES (p.user_id, COALESCE(p.plan, 'pro'::plan_tier), new_expires)
    ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, expires_at = EXCLUDED.expires_at;

    INSERT INTO public.user_notifications (user_id, kind, title, body, href, dedupe_key)
    VALUES (p.user_id, 'system', 'Plan activated',
      'Your crypto payment was confirmed and your plan is now active.', '/billing', 'crypto:' || p.order_id)
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;

  PERFORM public.settle_referral(p.user_id, p.amount);

  RETURN jsonb_build_object('ok', true);
END; $$;