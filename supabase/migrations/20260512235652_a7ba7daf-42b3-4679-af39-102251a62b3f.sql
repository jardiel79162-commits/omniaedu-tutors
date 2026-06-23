
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS bio text;

-- Allow admins (or self) to update chat_members rows (e.g., promote to admin)
DROP POLICY IF EXISTS "admins update members" ON public.chat_members;
CREATE POLICY "admins update members"
ON public.chat_members
FOR UPDATE
TO authenticated
USING (public.is_chat_admin(chat_id, auth.uid()))
WITH CHECK (public.is_chat_admin(chat_id, auth.uid()));

-- Avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars auth upload" ON storage.objects;
CREATE POLICY "avatars auth upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars auth update" ON storage.objects;
CREATE POLICY "avatars auth update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars auth delete" ON storage.objects;
CREATE POLICY "avatars auth delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
