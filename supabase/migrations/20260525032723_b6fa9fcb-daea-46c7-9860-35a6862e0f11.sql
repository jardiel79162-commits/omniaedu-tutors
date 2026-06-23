
-- Storage: drop overly-permissive public SELECT policies on private buckets
DROP POLICY IF EXISTS "chat-media public read" ON storage.objects;
DROP POLICY IF EXISTS "status-media public read" ON storage.objects;
DROP POLICY IF EXISTS "voice msgs public read" ON storage.objects;

-- Storage: drop overly-broad avatar policies (public bucket still serves via direct URL)
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars auth delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars auth update" ON storage.objects;
DROP POLICY IF EXISTS "avatars auth upload" ON storage.objects;

-- Storage: path-scoped avatar INSERT
CREATE POLICY "Avatar owners can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE ('users/' || auth.uid()::text || '-%')
);

-- Realtime: deny unknown topic prefixes by default
DROP POLICY IF EXISTS "members subscribe to chat topics" ON realtime.messages;
CREATE POLICY "members subscribe to chat topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN topic LIKE 'chat-%' THEN is_chat_member(
      NULLIF(substring(topic, 'chat-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid,
      auth.uid()
    )
    WHEN topic LIKE 'call-events-%' THEN substring(topic from 13) = auth.uid()::text
    WHEN topic LIKE 'call-notify-%' THEN is_chat_member(
      NULLIF(substring(topic, 'call-notify-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid,
      auth.uid()
    )
    WHEN topic LIKE 'call-signal-%' THEN is_chat_member(
      NULLIF(substring(topic, 'call-signal-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid,
      auth.uid()
    )
    WHEN topic LIKE 'call-page-%' THEN true
    WHEN topic LIKE 'call-%' THEN is_chat_member(
      NULLIF(substring(topic, 'call-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid,
      auth.uid()
    )
    ELSE false
  END
);

-- Revoke direct PostgREST execution on internal SECURITY DEFINER helpers.
-- They remain callable from triggers/policies (SECURITY DEFINER ignores EXECUTE for internal callers).
REVOKE EXECUTE ON FUNCTION public.ensure_direct_chat(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_unique_short_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_plus_user(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_friendship_status_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profiles_set_short_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_chat_last_message() FROM anon, authenticated, PUBLIC;

-- append_call_ice is called via RPC from authenticated clients — keep that, revoke anon.
REVOKE EXECUTE ON FUNCTION public.append_call_ice(uuid, jsonb, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_call_ice(uuid, jsonb, text) TO authenticated;
