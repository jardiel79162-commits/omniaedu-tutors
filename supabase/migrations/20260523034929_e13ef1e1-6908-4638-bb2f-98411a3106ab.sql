-- 1. Drop email from profiles (PII leak)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, short_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    public.generate_unique_short_code()
  );
  RETURN NEW;
END;
$function$;

-- 2. Privatize media buckets
UPDATE storage.buckets SET public = false WHERE id IN ('chat-media','voice-messages','status-media');

-- 3. Storage policies: chat-media + voice-messages (path: {chat_id}/{user_id}/{file})
DROP POLICY IF EXISTS "chat-media members read" ON storage.objects;
CREATE POLICY "chat-media members read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "chat-media members insert" ON storage.objects;
CREATE POLICY "chat-media members insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "chat-media owner delete" ON storage.objects;
CREATE POLICY "chat-media owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "voice members read" ON storage.objects;
CREATE POLICY "voice members read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "voice members insert" ON storage.objects;
CREATE POLICY "voice members insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

DROP POLICY IF EXISTS "voice owner delete" ON storage.objects;
CREATE POLICY "voice owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[2] = auth.uid()::text);

-- 4. Status media (path: {user_id}/{ts}.{ext})
DROP POLICY IF EXISTS "status-media visible read" ON storage.objects;
CREATE POLICY "status-media visible read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'status-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.shares_chat_with(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

DROP POLICY IF EXISTS "status-media owner write" ON storage.objects;
CREATE POLICY "status-media owner write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "status-media owner delete" ON storage.objects;
CREATE POLICY "status-media owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Avatars: lock UPDATE/DELETE to owner (path: users/{user_id}-{ts}.ext)
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can delete" ON storage.objects;

CREATE POLICY "Avatar owners can update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND name LIKE 'users/' || auth.uid()::text || '-%')
WITH CHECK (bucket_id = 'avatars' AND name LIKE 'users/' || auth.uid()::text || '-%');

CREATE POLICY "Avatar owners can delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND name LIKE 'users/' || auth.uid()::text || '-%');

-- 6. Realtime: restrict topic subscriptions to chat members for chat/call topics
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members subscribe to chat topics" ON realtime.messages;
CREATE POLICY "members subscribe to chat topics" ON realtime.messages
FOR SELECT TO authenticated
USING (
  CASE
    WHEN topic LIKE 'chat-%' THEN
      public.is_chat_member(NULLIF(substring(topic FROM 6), '')::uuid, auth.uid())
    WHEN topic LIKE 'call-events-%' THEN
      substring(topic FROM 13) = auth.uid()::text
    WHEN topic LIKE 'call-%' THEN
      public.is_chat_member(NULLIF(substring(topic FROM 6), '')::uuid, auth.uid())
    ELSE true
  END
);

-- 7. Revoke EXECUTE on SECURITY DEFINER funcs not meant to be called by clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_chat_last_message() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.profiles_set_short_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_friendship_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_call_events_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_direct_chat(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_unique_short_code() FROM anon, authenticated, public;
-- Keep is_chat_member, is_chat_admin, shares_chat_with executable (used in RLS)