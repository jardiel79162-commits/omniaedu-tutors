-- Add message type and media url to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

-- Storage bucket for voice messages (public read for simplicity; path includes chat id)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects on voice-messages bucket
DROP POLICY IF EXISTS "voice msgs public read" ON storage.objects;
CREATE POLICY "voice msgs public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "voice msgs auth upload" ON storage.objects;
CREATE POLICY "voice msgs auth upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "voice msgs owner delete" ON storage.objects;
CREATE POLICY "voice msgs owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND (storage.foldername(name))[1] = auth.uid()::text
);