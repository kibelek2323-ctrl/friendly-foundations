CREATE TABLE public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null,
  note text not null default '',
  granted_by uuid,
  created_at timestamptz not null default now(),
  unique (user_id, badge)
);

GRANT SELECT ON public.profile_badges TO anon;
GRANT SELECT ON public.profile_badges TO authenticated;
GRANT ALL ON public.profile_badges TO service_role;

ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are publicly readable" ON public.profile_badges FOR SELECT USING (true);

CREATE INDEX profile_badges_user_idx ON public.profile_badges (user_id);