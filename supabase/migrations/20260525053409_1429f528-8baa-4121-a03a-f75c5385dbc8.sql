
-- Re-grant EXECUTE on SECURITY DEFINER helpers used inside RLS policies.
-- PostgREST evaluates these as the 'authenticated' role; without EXECUTE
-- every query referencing them returns 42501 (permission denied).
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_plus_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_chat(uuid, uuid) TO authenticated;
