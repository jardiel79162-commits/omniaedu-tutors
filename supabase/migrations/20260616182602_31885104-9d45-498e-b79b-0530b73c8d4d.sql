REVOKE SELECT (groq_api_key) ON public.ai_settings FROM anon, authenticated;
REVOKE SELECT (api_key, base_url) ON public.evolution_settings FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_direct_chat(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_profile_is_plus(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_unique_short_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.append_call_ice(uuid, jsonb, text) FROM anon, public;