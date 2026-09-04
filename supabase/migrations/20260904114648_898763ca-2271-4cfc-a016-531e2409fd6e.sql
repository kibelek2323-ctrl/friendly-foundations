REVOKE SELECT ON public.marketplace_listings FROM anon, authenticated;

GRANT SELECT (id, seller_id, source_bot_id, title, summary, description, images, tags, price, sales_count, published, created_at, updated_at, category, views, version)
  ON public.marketplace_listings TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;