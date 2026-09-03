ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('listing','user','review')),
  target_id text NOT NULL,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create own reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "users read own reports" ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "service role manages reports" ON public.reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.balance_adjustments TO authenticated;
GRANT ALL ON public.balance_adjustments TO service_role;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own balance adjustments readable" ON public.balance_adjustments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "service role manages balance adjustments" ON public.balance_adjustments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_admin_id uuid, _user_id uuid, _amount integer, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance integer;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  INSERT INTO public.user_balances (user_id, balance) VALUES (_user_id, GREATEST(_amount, 0))
  ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(public.user_balances.balance + _amount, 0), updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.balance_adjustments (user_id, amount, reason, admin_id)
  VALUES (_user_id, _amount, COALESCE(_reason, ''), _admin_id);

  INSERT INTO public.user_notifications (user_id, kind, title, body, href, dedupe_key)
  VALUES (_user_id, 'system', 'Balance updated',
    'An administrator adjusted your balance by $' || to_char(_amount / 100.0, 'FM999999990.00') || '.',
    '/balance', 'adjust:' || gen_random_uuid()::text)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance);
END; $$;