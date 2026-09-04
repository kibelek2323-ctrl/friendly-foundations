ALTER TABLE public.crypto_payments
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pay_amount numeric,
  ADD COLUMN IF NOT EXISTS pay_address text;