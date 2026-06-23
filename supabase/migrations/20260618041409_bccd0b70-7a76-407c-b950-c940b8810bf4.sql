REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated, service_role, supabase_storage_admin, authenticator;
GRANT EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) TO authenticated, service_role, supabase_storage_admin, authenticator;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated, service_role, supabase_storage_admin, authenticator;