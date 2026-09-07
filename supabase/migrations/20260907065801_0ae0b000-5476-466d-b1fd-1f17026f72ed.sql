-- 1. Two-factor verified sessions (server-enforced 2FA gate)
CREATE TABLE IF NOT EXISTS public.two_factor_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.two_factor_sessions TO service_role;
ALTER TABLE public.two_factor_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS two_factor_sessions_user_idx ON public.two_factor_sessions (user_id);

-- 2. Discord OAuth tokens: encrypted at rest + never readable by the Data API
ALTER TABLE public.discord_connections
  ADD COLUMN IF NOT EXISTS token_iv TEXT,
  ADD COLUMN IF NOT EXISTS refresh_iv TEXT,
  ADD COLUMN IF NOT EXISTS key_version INTEGER;

REVOKE SELECT ON public.discord_connections FROM anon;
REVOKE SELECT ON public.discord_connections FROM authenticated;
GRANT SELECT (
  id, user_id, discord_user_id, username, discriminator, avatar_url,
  scopes, expires_at, created_at, updated_at
) ON public.discord_connections TO authenticated;

-- 3. Reviews only readable for published listings (or by the review author / seller)
DROP POLICY IF EXISTS "reviews are public" ON public.listing_reviews;
CREATE POLICY "reviews readable for published listings" ON public.listing_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_reviews.listing_id
        AND (l.published = true OR l.seller_id = auth.uid())
    )
    OR listing_reviews.user_id = auth.uid()
  );

-- 4. Version notes only readable for published listings (or by the seller)
DROP POLICY IF EXISTS "listing_versions_public_read" ON public.listing_versions;
CREATE POLICY "listing_versions_public_read" ON public.listing_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_versions.listing_id
        AND (l.published = true OR l.seller_id = auth.uid())
    )
  );