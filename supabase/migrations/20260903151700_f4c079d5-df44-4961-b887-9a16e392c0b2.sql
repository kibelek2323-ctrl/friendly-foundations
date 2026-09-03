CREATE POLICY "service role manages plan codes" ON public.plan_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role manages balance codes" ON public.balance_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);