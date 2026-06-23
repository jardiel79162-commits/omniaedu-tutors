DROP POLICY IF EXISTS "Public can download installers" ON storage.objects;
CREATE POLICY "Public can download windows installer"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'downloads' AND name = 'JTC-INTERLINK-windows-x64.zip');