CREATE TABLE public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('popup','bar')),
  title text not null default '',
  body text not null default '',
  cta_label text,
  cta_url text,
  variant text not null default 'info' check (variant in ('info','success','warning','promo')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.site_announcements TO anon;
GRANT SELECT ON public.site_announcements TO authenticated;
GRANT ALL ON public.site_announcements TO service_role;

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active announcements readable" ON public.site_announcements
FOR SELECT TO anon, authenticated
USING (active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "service role manages announcements" ON public.site_announcements
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER site_announcements_touch BEFORE UPDATE ON public.site_announcements
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();