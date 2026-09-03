CREATE TABLE public.discord_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_user_id text,
    username text,
    discriminator text,
    avatar_url text,
    access_token text NOT NULL,
    refresh_token text,
    scopes text[] NOT NULL DEFAULT '{}',
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_connections TO authenticated;
GRANT ALL ON public.discord_connections TO service_role;

ALTER TABLE public.discord_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Discord connection"
ON public.discord_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_discord_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER discord_connections_updated_at
BEFORE UPDATE ON public.discord_connections
FOR EACH ROW EXECUTE FUNCTION public.update_discord_connections_updated_at();