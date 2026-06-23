DROP POLICY IF EXISTS "tags update auth" ON public.hashtags;
REVOKE EXECUTE ON FUNCTION public.sync_profile_is_plus(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_is_plus(uuid) FROM anon, authenticated;