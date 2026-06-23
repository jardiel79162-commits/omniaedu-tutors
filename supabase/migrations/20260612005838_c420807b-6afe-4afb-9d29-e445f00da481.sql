
-- Lock down SECURITY DEFINER helpers: revoke from PUBLIC/anon, allow only what is needed.
REVOKE ALL ON FUNCTION public.is_chat_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_chat_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_chat_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_direct_chat(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_plus_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_profile_is_plus(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_unique_short_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.append_call_ice(uuid, jsonb, text) FROM PUBLIC, anon;

-- Trigger functions: nobody should call directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_chat_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_set_short_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_friendship_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_comment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_post_like_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_conv_request_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_post_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_follow_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_subscriptions_sync_plus() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_call_events_updated_at() FROM PUBLIC, anon, authenticated;

-- Grant only what authenticated callers need at runtime.
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_chat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_plus_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_call_ice(uuid, jsonb, text) TO authenticated;
