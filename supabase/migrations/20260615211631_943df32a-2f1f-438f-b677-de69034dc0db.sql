CREATE POLICY "Public can download installers"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'downloads');