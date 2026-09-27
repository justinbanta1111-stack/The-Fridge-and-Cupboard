CREATE POLICY "Users read own dish photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own dish photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own dish photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own dish photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);