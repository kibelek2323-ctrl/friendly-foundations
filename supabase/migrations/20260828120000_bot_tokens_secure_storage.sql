-- Phase 1: secure Discord bot token storage.
--
-- Tokens used to live inside public.bots.data, which is selectable by the
-- browser through the "own bots" RLS policy and is mirrored into localStorage.
-- They now live in their own table which:
--   * grants NOTHING to `anon` / `authenticated` (PostgREST -> permission denied)
--   * has RLS enabled and forced, with a policy only for service_role
--   * stores AES-256-GCM ciphertext; the key lives in the server environment
--     (BOT_TOKEN_ENCRYPTION_KEY), never in the database
-- Only trusted server code (control-plane server functions and the runtime)
-- authenticates with the service role and can therefore read a token.

CREATE TABLE public.bot_tokens (
  bot_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  -- base64 AES-256-GCM ciphertext (includes the GCM auth tag)
  ciphertext TEXT NOT NULL,
  -- base64 12-byte nonce, unique per write
  iv TEXT NOT NULL,
  key_version SMALLINT NOT NULL DEFAULT 1,
  -- Discord application id. Public information (it is derivable from the token's
  -- first segment) and is what a real invite URL needs.
  application_id TEXT,
  -- Last time the token was actually accepted by GET /users/@me.
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bot_id),
  CONSTRAINT bot_tokens_bot_fkey FOREIGN KEY (user_id, bot_id)
    REFERENCES public.bots (user_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE public.bot_tokens IS
  'Encrypted Discord bot tokens. Never exposed to the browser: no grants for anon/authenticated, service_role only.';
COMMENT ON COLUMN public.bot_tokens.ciphertext IS 'base64 AES-256-GCM ciphertext of the bot token.';
COMMENT ON COLUMN public.bot_tokens.iv IS 'base64 12-byte AES-GCM nonce.';

ALTER TABLE public.bot_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_tokens FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.bot_tokens FROM PUBLIC;
REVOKE ALL ON public.bot_tokens FROM anon;
REVOKE ALL ON public.bot_tokens FROM authenticated;
GRANT ALL ON public.bot_tokens TO service_role;

-- service_role normally carries BYPASSRLS, but an explicit policy keeps access
-- working even if that attribute is ever removed, and documents the intent.
CREATE POLICY "service role manages bot tokens" ON public.bot_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- The runtime resolves bots by bot_id without knowing the owner up front.
CREATE INDEX bot_tokens_bot_id_idx ON public.bot_tokens (bot_id);

CREATE TRIGGER bot_tokens_touch BEFORE UPDATE ON public.bot_tokens
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Purge plaintext tokens previously synced into bots.data.
-- These are deliberately NOT migrated into bot_tokens: they were readable by the
-- browser (localStorage + a client-selectable JSONB column), so they have to be
-- treated as leaked and reset in the Discord developer portal. Removing the key
-- also stops any future pullWorkspace() from re-seeding the client store.
UPDATE public.bots
SET data = data - 'token'
WHERE jsonb_exists(data, 'token');