-- app_settings: all app reads go through the service-role client; drop the public read policy
DROP POLICY IF EXISTS "app_settings_public_read" ON public.app_settings;

-- profile_badges: badge display is fetched server-side via the service-role client;
-- drop the public read policy so user_id / granted_by are no longer enumerable
DROP POLICY IF EXISTS "Badges are publicly readable" ON public.profile_badges;