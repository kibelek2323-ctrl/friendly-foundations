-- These tables are service-role only; revoke direct Data API access from client roles.
REVOKE ALL ON public.app_settings FROM anon, authenticated;
REVOKE ALL ON public.profile_badges FROM anon, authenticated;

-- Explicitly keep service_role access for server-side readers.
GRANT ALL ON public.app_settings TO service_role;
GRANT ALL ON public.profile_badges TO service_role;