GRANT SELECT, DELETE ON public.marketplace_listings TO authenticated;
GRANT SELECT ON public.listing_versions TO anon, authenticated;
GRANT SELECT ON public.listing_reviews TO authenticated;
GRANT SELECT ON public.site_announcements TO authenticated;
GRANT SELECT ON public.site_content TO authenticated;
GRANT SELECT ON public.flow_templates TO authenticated;
GRANT SELECT ON public.blog_posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;