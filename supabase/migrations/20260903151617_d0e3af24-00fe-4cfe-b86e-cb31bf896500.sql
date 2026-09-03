
REVOKE EXECUTE ON FUNCTION public.redeem_balance_code(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.purchase_listing(uuid, uuid, text, jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.redeem_balance_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_listing(uuid, uuid, text, jsonb) TO service_role;