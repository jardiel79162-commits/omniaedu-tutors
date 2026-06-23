GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "chat-media members read" ON storage.objects;
DROP POLICY IF EXISTS "chat-media members insert" ON storage.objects;
DROP POLICY IF EXISTS "voice members read" ON storage.objects;
DROP POLICY IF EXISTS "voice members insert" ON storage.objects;

CREATE POLICY "chat-media members read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_chat_member(((storage.foldername(name))[2])::uuid, auth.uid())
  )
);

CREATE POLICY "chat-media members insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (
    (((storage.foldername(name))[2] = (auth.uid())::text)
      AND public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid()))
    OR
    (((storage.foldername(name))[1] = (auth.uid())::text)
      AND public.is_chat_member(((storage.foldername(name))[2])::uuid, auth.uid()))
  )
);

CREATE POLICY "voice members read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND (
    public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_chat_member(((storage.foldername(name))[2])::uuid, auth.uid())
  )
);

CREATE POLICY "voice members insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages'
  AND (
    (((storage.foldername(name))[2] = (auth.uid())::text)
      AND public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid()))
    OR
    (((storage.foldername(name))[1] = (auth.uid())::text)
      AND public.is_chat_member(((storage.foldername(name))[2])::uuid, auth.uid()))
  )
);