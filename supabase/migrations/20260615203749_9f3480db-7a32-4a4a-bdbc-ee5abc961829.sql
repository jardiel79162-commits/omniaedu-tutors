DROP POLICY IF EXISTS "tags insert auth" ON public.hashtags;
CREATE POLICY "tags insert auth" ON public.hashtags
  FOR INSERT TO authenticated
  WITH CHECK (tag ~ '^[a-z0-9_]{1,64}$');