
-- 1) Restrict storage policies on fridge-photos to authenticated role only (no anon)
DROP POLICY IF EXISTS "Users can view their own fridge photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own fridge photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own fridge photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own fridge photos" ON storage.objects;

CREATE POLICY "Users can view their own fridge photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fridge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own fridge photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fridge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own fridge photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fridge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Lock down SECURITY DEFINER trigger functions — they should only run from triggers, not be callable via the API.
REVOKE ALL ON FUNCTION public.recipe_votes_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recipe_votes_after_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_referral_code_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) has_active_subscription: keep authenticated callable (used by app to check own sub), revoke from anon.
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;
