REVOKE EXECUTE ON FUNCTION public.ensure_direct_chat(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_friendship_status_change() FROM PUBLIC, anon, authenticated;