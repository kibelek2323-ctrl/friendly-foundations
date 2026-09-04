CREATE TABLE public.code_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id text NOT NULL,
  name text NOT NULL,
  storage_prefix text NOT NULL,
  runtime text NOT NULL DEFAULT 'javascript',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, bot_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_projects TO authenticated;
GRANT ALL ON public.code_projects TO service_role;
ALTER TABLE public.code_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their code projects" ON public.code_projects
  FOR ALL TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER code_projects_touch BEFORE UPDATE ON public.code_projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.code_project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.code_projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  size integer NOT NULL DEFAULT 0,
  content_type text NOT NULL DEFAULT 'text/plain',
  is_folder boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_project_files TO authenticated;
GRANT ALL ON public.code_project_files TO service_role;
ALTER TABLE public.code_project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their project files" ON public.code_project_files
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.code_projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.code_projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE TRIGGER code_project_files_touch BEFORE UPDATE ON public.code_project_files
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS source_project_id uuid REFERENCES public.code_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'flow';

CREATE TABLE public.bot_config_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.code_projects(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  schema jsonb NOT NULL DEFAULT '{"version":1,"settings":{}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_config_schemas TO authenticated;
GRANT ALL ON public.bot_config_schemas TO service_role;
ALTER TABLE public.bot_config_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their config schemas" ON public.bot_config_schemas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.code_projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.code_projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "Buyers read schemas of published listings" ON public.bot_config_schemas
  FOR SELECT TO authenticated
  USING (listing_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.marketplace_purchases mp WHERE mp.listing_id = bot_config_schemas.listing_id AND mp.buyer_id = auth.uid()
  ));
CREATE TRIGGER bot_config_schemas_touch BEFORE UPDATE ON public.bot_config_schemas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.buyer_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.code_projects(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id text,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_configurations TO authenticated;
GRANT ALL ON public.buyer_configurations TO service_role;
ALTER TABLE public.buyer_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers manage their own configuration" ON public.buyer_configurations
  FOR ALL TO authenticated
  USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = buyer_id AND EXISTS (
    SELECT 1 FROM public.marketplace_purchases mp WHERE mp.listing_id = buyer_configurations.listing_id AND mp.buyer_id = auth.uid()
  ));
CREATE TRIGGER buyer_configurations_touch BEFORE UPDATE ON public.buyer_configurations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();