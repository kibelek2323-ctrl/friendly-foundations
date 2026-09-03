-- Phase 2: runtime control plane state.
--
-- "Start bot" used to be a local UI toggle. A separate runtime service now owns
-- the Discord gateway connections and reports back over the internal API
-- (src/routes/api.internal.runtime.events.ts); its reports land in these tables.
--
-- Access model for both tables:
--   * service_role : full access (control-plane server functions + runtime callbacks)
--   * authenticated: SELECT on own rows only (dashboard reads state and activity)
--   * anon         : nothing

CREATE TABLE public.bot_runtime_state (
  bot_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'offline'
    CHECK (state IN ('offline', 'starting', 'online', 'stopping', 'error')),
  -- When the current gateway session came up.
  started_at TIMESTAMPTZ,
  -- Last failure reported by the runtime, already safe to show a user.
  last_error TEXT,
  guild_count INTEGER CHECK (guild_count IS NULL OR guild_count >= 0),
  -- Discord username the gateway logged in as. Public information.
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bot_id),
  CONSTRAINT bot_runtime_state_bot_fkey FOREIGN KEY (user_id, bot_id)
    REFERENCES public.bots (user_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE public.bot_runtime_state IS
  'Last known gateway state per bot, written by the control plane and the runtime service.';

ALTER TABLE public.bot_runtime_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bot_runtime_state FROM PUBLIC;
REVOKE ALL ON public.bot_runtime_state FROM anon;
GRANT SELECT ON public.bot_runtime_state TO authenticated;
GRANT ALL ON public.bot_runtime_state TO service_role;

CREATE POLICY "owners read runtime state" ON public.bot_runtime_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "service role manages runtime state" ON public.bot_runtime_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER bot_runtime_state_touch BEFORE UPDATE ON public.bot_runtime_state
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bot_runtime_events (
  id BIGSERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'success', 'warning', 'error')),
  event TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bot_runtime_events_bot_fkey FOREIGN KEY (user_id, bot_id)
    REFERENCES public.bots (user_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE public.bot_runtime_events IS
  'Activity reported by the runtime service (connects, disconnects, errors).';

CREATE INDEX bot_runtime_events_recent_idx
  ON public.bot_runtime_events (user_id, bot_id, created_at DESC);

ALTER TABLE public.bot_runtime_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bot_runtime_events FROM PUBLIC;
REVOKE ALL ON public.bot_runtime_events FROM anon;
GRANT SELECT ON public.bot_runtime_events TO authenticated;
GRANT ALL ON public.bot_runtime_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.bot_runtime_events_id_seq TO service_role;

CREATE POLICY "owners read runtime events" ON public.bot_runtime_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "service role manages runtime events" ON public.bot_runtime_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);