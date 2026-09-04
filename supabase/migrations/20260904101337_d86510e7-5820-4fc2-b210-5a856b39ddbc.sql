REVOKE EXECUTE ON FUNCTION public.credit_crypto_payment(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_crypto_payment(text, text, text) TO service_role;