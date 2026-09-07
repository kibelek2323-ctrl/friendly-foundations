REVOKE ALL ON FUNCTION public.protect_listing_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_listing_insert() TO service_role;
REVOKE ALL ON FUNCTION public.is_trusted_caller() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_trusted_caller() TO service_role;