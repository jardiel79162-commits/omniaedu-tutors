
INSERT INTO storage.buckets (id, name, public)
VALUES ('status-media', 'status-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "status-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'status-media');

CREATE POLICY "status-media own insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "status-media own delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1]);
