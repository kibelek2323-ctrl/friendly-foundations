ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';

CREATE TABLE public.developer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience text not null default '',
  ai_usage text not null default '',
  portfolio_url text not null default '',
  github_url text not null default '',
  motivation text not null default '',
  status text not null default 'pending',
  admin_note text not null default '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX developer_applications_status_idx ON public.developer_applications (status, created_at DESC);
CREATE UNIQUE INDEX developer_applications_pending_uniq ON public.developer_applications (user_id) WHERE status = 'pending';

GRANT SELECT, INSERT ON public.developer_applications TO authenticated;
GRANT ALL ON public.developer_applications TO service_role;

ALTER TABLE public.developer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.developer_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can submit own applications"
  ON public.developer_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER developer_applications_touch
  BEFORE UPDATE ON public.developer_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();