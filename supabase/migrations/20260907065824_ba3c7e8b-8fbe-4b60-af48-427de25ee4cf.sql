CREATE POLICY "two_factor_sessions service role only" ON public.two_factor_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);