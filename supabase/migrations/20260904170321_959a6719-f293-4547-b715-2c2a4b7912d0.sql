create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

grant select on public.site_content to anon, authenticated;
grant all on public.site_content to service_role;

alter table public.site_content enable row level security;

create policy "Public can read site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

insert into public.site_content (key, value) values
  ('homepage', '{"badgeIcon":"zap","badgeText":"No code. No hosting headaches.","headlineBefore":"Build Discord bots","headlineAccent":"visually","subtext":"Bottly turns embeds, slash commands, buttons and automations into a drag-and-drop workspace with a pixel-accurate Discord preview beside every change.","stats":[{"value":"120k+","label":"bots built"},{"value":"18M","label":"members reached"},{"value":"99.9%","label":"uptime"}]}'::jsonb)
on conflict (key) do nothing;