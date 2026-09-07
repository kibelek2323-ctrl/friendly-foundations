-- 1. Role check must be tamper-proof and must not depend on the caller's RLS view.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2. Trusted-caller helper. The previous triggers tested current_user, which inside a
--    SECURITY DEFINER function is always the owner (postgres) -- so every protection
--    was bypassed for ordinary users. Test the request's JWT role instead.
CREATE OR REPLACE FUNCTION public.is_trusted_caller()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE claims text; jwt_role text;
BEGIN
  claims := current_setting('request.jwt.claims', true);
  IF claims IS NULL OR claims = '' THEN
    -- No PostgREST request context: direct SQL / migrations / trusted jobs.
    RETURN true;
  END IF;
  jwt_role := (claims::jsonb ->> 'role');
  RETURN jwt_role IN ('service_role', 'supabase_admin');
END; $$;
REVOKE ALL ON FUNCTION public.is_trusted_caller() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trusted_caller() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_caller() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.verified := OLD.verified;
  NEW.banned := OLD.banned;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.protect_listing_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_caller() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.sales_count := OLD.sales_count;
  NEW.views := OLD.views;
  NEW.seller_id := OLD.seller_id;
  RETURN NEW;
END; $$;

-- Inserts were unguarded: a seller could publish a listing with fake sales/views.
CREATE OR REPLACE FUNCTION public.protect_listing_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_caller() OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.sales_count := 0;
  NEW.views := 0;
  NEW.seller_id := auth.uid();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS marketplace_listings_protect_insert ON public.marketplace_listings;
CREATE TRIGGER marketplace_listings_protect_insert
BEFORE INSERT ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_insert();

-- 3. Least privilege for anonymous visitors: read-only, and only where a public
--    SELECT policy actually exists.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.site_announcements TO anon;
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.flow_templates TO anon;
GRANT SELECT ON public.listing_reviews TO anon;

-- 4. Signed-in users must not be able to write to privilege / money / audit tables
--    even if an RLS policy is ever added by mistake.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_roles','user_plans','user_balances','balance_adjustments',
    'balance_codes','balance_code_redemptions','plan_codes','plan_code_redemptions',
    'discount_codes','discount_code_redemptions','app_settings','payout_requests',
    'crypto_payments','referrals','referral_codes','marketplace_purchases',
    'profile_badges','listing_versions','email_otp_codes','two_factor_sessions',
    'user_2fa','ai_usage','bot_runtime_state','bot_runtime_events',
    'site_content','site_announcements','flow_templates','hosting_nodes'
  ] LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.%I FROM authenticated', t);
  END LOOP;
END $$;
-- Admins manage hosting nodes through an RLS policy on the authenticated role.
GRANT INSERT, UPDATE, DELETE ON public.hosting_nodes TO authenticated;

REVOKE INSERT, UPDATE ON public.bot_tokens FROM authenticated;
REVOKE UPDATE, DELETE ON public.user_notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.user_notifications TO authenticated;

-- 5. Column allowlists: users may only edit their own content, never privilege
--    or metric columns, regardless of what the client sends.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, username, bio, avatar_url, updated_at) ON public.profiles TO authenticated;

REVOKE INSERT, UPDATE ON public.marketplace_listings FROM authenticated;
GRANT INSERT (id, seller_id, source_bot_id, source_project_id, title, summary, description,
              images, tags, price, bot_data, flow_data, published, category, kind, version,
              created_at, updated_at)
  ON public.marketplace_listings TO authenticated;
GRANT UPDATE (title, summary, description, images, tags, price, bot_data, flow_data,
              published, category, kind, version, source_bot_id, source_project_id, updated_at)
  ON public.marketplace_listings TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;