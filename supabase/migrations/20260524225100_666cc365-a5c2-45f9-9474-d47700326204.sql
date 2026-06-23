REVOKE EXECUTE ON FUNCTION public.is_plus_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_plus_user(uuid) TO authenticated;