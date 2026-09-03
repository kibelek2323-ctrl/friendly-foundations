-- Data API grants (missing entirely on this project)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots, public.flows, public.profiles, public.discord_connections, public.bot_tokens, public.marketplace_listings TO authenticated;
GRANT SELECT ON public.ai_usage, public.balance_code_redemptions, public.bot_runtime_events, public.bot_runtime_state, public.flow_templates, public.marketplace_purchases, public.plan_code_redemptions, public.site_announcements, public.user_balances, public.user_plans, public.user_roles TO authenticated;
GRANT SELECT ON public.flow_templates, public.marketplace_listings, public.site_announcements TO anon;
GRANT ALL ON public.ai_usage, public.balance_code_redemptions, public.balance_codes, public.bot_runtime_events, public.bot_runtime_state, public.bot_tokens, public.bots, public.discord_connections, public.flow_templates, public.flows, public.marketplace_listings, public.marketplace_purchases, public.plan_code_redemptions, public.plan_codes, public.profiles, public.site_announcements, public.user_balances, public.user_plans, public.user_roles TO service_role;

-- Marketplace image storage policies (private bucket, served via signed URLs)
CREATE POLICY "own marketplace images insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own marketplace images select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own marketplace images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace-images' AND (storage.foldername(name))[1] = auth.uid()::text);