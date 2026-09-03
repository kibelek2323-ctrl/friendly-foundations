-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Plan type
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'ultimate');

CREATE TABLE public.plan_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan public.plan_tier NOT NULL,
  duration_days integer,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.plan_codes TO service_role;
ALTER TABLE public.plan_codes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER plan_codes_touch BEFORE UPDATE ON public.plan_codes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_plans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  expires_at timestamptz,
  activated_code_id uuid REFERENCES public.plan_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan readable" ON public.user_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_plans_touch BEFORE UPDATE ON public.user_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.plan_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.plan_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT ON public.plan_code_redemptions TO authenticated;
GRANT ALL ON public.plan_code_redemptions TO service_role;
ALTER TABLE public.plan_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemptions readable" ON public.plan_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai usage readable" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER ai_usage_touch BEFORE UPDATE ON public.ai_usage FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Redeem a plan code atomically
CREATE OR REPLACE FUNCTION public.redeem_plan_code(_user_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.plan_codes%ROWTYPE;
  new_expires timestamptz;
BEGIN
  SELECT * INTO c FROM public.plan_codes
  WHERE upper(code) = upper(btrim(_code)) FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nieprawidłowy kod.');
  END IF;
  IF NOT c.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ten kod jest nieaktywny.');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ten kod wygasł.');
  END IF;
  IF c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kod został już w pełni wykorzystany.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.plan_code_redemptions WHERE code_id = c.id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ten kod został już przez Ciebie użyty.');
  END IF;

  IF c.duration_days IS NULL THEN
    new_expires := NULL;
  ELSE
    new_expires := now() + make_interval(days => c.duration_days);
  END IF;

  INSERT INTO public.plan_code_redemptions (code_id, user_id) VALUES (c.id, _user_id);
  UPDATE public.plan_codes SET used_count = used_count + 1 WHERE id = c.id;

  INSERT INTO public.user_plans (user_id, plan, expires_at, activated_code_id)
  VALUES (_user_id, c.plan, new_expires, c.id)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        expires_at = EXCLUDED.expires_at,
        activated_code_id = EXCLUDED.activated_code_id;

  RETURN jsonb_build_object('ok', true, 'plan', c.plan, 'expires_at', new_expires);
END; $$;

REVOKE ALL ON FUNCTION public.redeem_plan_code(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code(uuid, text) TO service_role;

-- Increment AI usage and return the new daily count
CREATE OR REPLACE FUNCTION public.bump_ai_usage(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_count integer;
BEGIN
  INSERT INTO public.ai_usage (user_id, day, count)
  VALUES (_user_id, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = public.ai_usage.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END; $$;

REVOKE ALL ON FUNCTION public.bump_ai_usage(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_ai_usage(uuid) TO service_role;