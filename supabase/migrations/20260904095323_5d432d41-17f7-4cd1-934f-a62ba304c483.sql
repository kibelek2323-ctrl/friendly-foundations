ALTER TABLE public.site_announcements
  ADD COLUMN IF NOT EXISTS dismissible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'megaphone';

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.site_announcements'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%variant%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.site_announcements DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.site_announcements
  ADD CONSTRAINT site_announcements_variant_check
  CHECK (variant IN ('info','success','warning','promo','error'));