CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.verified := OLD.verified;
  NEW.banned := OLD.banned;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.protect_listing_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.sales_count := OLD.sales_count;
  NEW.views := OLD.views;
  NEW.seller_id := OLD.seller_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS marketplace_listings_protect_metrics ON public.marketplace_listings;
CREATE TRIGGER marketplace_listings_protect_metrics
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_metrics();