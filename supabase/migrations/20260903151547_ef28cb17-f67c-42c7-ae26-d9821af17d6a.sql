DROP TABLE IF EXISTS public.bot_tokens CASCADE;

CREATE TABLE public.bot_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id text NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  application_id text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bot_id)
);

GRANT SELECT, DELETE ON public.bot_tokens TO authenticated;
GRANT ALL ON public.bot_tokens TO service_role;

ALTER TABLE public.bot_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bot tokens"
ON public.bot_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bot tokens"
ON public.bot_tokens FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER bot_tokens_touch
BEFORE UPDATE ON public.bot_tokens
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();