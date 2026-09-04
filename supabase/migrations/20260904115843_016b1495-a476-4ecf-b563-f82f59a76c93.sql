-- Explicit default-deny policies: documents that no client role may access these tables.
CREATE POLICY "app_settings_deny_client_access" ON public.app_settings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "profile_badges_deny_client_access" ON public.profile_badges
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);