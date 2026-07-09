DROP POLICY IF EXISTS "Users can upload their own fridge photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own fridge photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own fridge photos" ON storage.objects;

CREATE POLICY "Users can view their own fridge photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fridge-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own fridge photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fridge-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own fridge photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fridge-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);