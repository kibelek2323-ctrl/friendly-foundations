CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  href text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_notifications_kind_check CHECK (kind IN ('purchase', 'sale', 'bot_status', 'bot_error', 'system')),
  CONSTRAINT user_notifications_user_dedupe UNIQUE (user_id, dedupe_key)
);
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users mark own notifications read" ON public.user_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX user_notifications_user_created_idx ON public.user_notifications (user_id, created_at DESC);

CREATE TABLE public.announcement_reads (
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.site_announcements(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
GRANT SELECT, INSERT, UPDATE ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own announcement receipts" ON public.announcement_reads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own announcement receipts" ON public.announcement_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own announcement receipts" ON public.announcement_reads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_marketplace_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE listing_title text;
DECLARE seller uuid;
BEGIN
  SELECT title, seller_id INTO listing_title, seller
  FROM public.marketplace_listings WHERE id = NEW.listing_id;

  INSERT INTO public.user_notifications (user_id, kind, title, body, href, dedupe_key)
  VALUES (
    NEW.buyer_id,
    'purchase',
    'Purchase complete',
    '“' || COALESCE(listing_title, 'Bot') || '” was added to your workspace.',
    '/bots/' || NEW.bot_id,
    'purchase:' || NEW.id::text
  ) ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  IF seller IS NOT NULL AND seller <> NEW.buyer_id THEN
    INSERT INTO public.user_notifications (user_id, kind, title, body, href, dedupe_key)
    VALUES (
      seller,
      'sale',
      'New marketplace sale',
      'You sold “' || COALESCE(listing_title, 'a bot') || '” for $' || to_char(NEW.price / 100.0, 'FM999999990.00') || '.',
      '/balance',
      'sale:' || NEW.id::text
    ) ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER marketplace_purchase_notify
AFTER INSERT ON public.marketplace_purchases
FOR EACH ROW EXECUTE FUNCTION public.notify_marketplace_purchase();

CREATE OR REPLACE FUNCTION public.notify_bot_runtime_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.state IS DISTINCT FROM OLD.state THEN
    INSERT INTO public.user_notifications (user_id, kind, title, body, href, dedupe_key)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.state = 'error' THEN 'bot_error' ELSE 'bot_status' END,
      CASE WHEN NEW.state = 'error' THEN 'Bot needs attention' ELSE 'Bot status changed' END,
      'Your bot is now ' || NEW.state || CASE WHEN NEW.last_error IS NOT NULL THEN ': ' || left(NEW.last_error, 240) ELSE '.' END,
      '/bots/' || NEW.bot_id,
      'runtime-state:' || NEW.bot_id || ':' || NEW.state || ':' || extract(epoch from NEW.updated_at)::bigint::text
    ) ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER bot_runtime_state_notify
AFTER UPDATE ON public.bot_runtime_state
FOR EACH ROW EXECUTE FUNCTION public.notify_bot_runtime_state();