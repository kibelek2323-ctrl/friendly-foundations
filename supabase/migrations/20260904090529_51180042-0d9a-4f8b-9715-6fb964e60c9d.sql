REVOKE EXECUTE ON FUNCTION public.request_payout(uuid, integer, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.resolve_payout(uuid, uuid, boolean, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.attach_referral(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.settle_referral(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_listing_view(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.request_payout(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_payout(uuid, uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_referral(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_referral(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_listing_view(uuid) TO service_role;

CREATE POLICY "email_otp_codes_no_access" ON public.email_otp_codes FOR SELECT TO authenticated USING (false);