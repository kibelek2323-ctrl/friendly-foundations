CREATE POLICY "service role manages ai usage" ON public.ai_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role manages bot tokens" ON public.bot_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role manages notifications" ON public.user_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON public.ai_usage TO service_role;
GRANT ALL ON public.bot_tokens TO service_role;
GRANT ALL ON public.user_notifications TO service_role;