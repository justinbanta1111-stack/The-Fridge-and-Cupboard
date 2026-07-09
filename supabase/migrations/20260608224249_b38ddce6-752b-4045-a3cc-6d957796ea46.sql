CREATE TABLE public.fridge_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  summary text,
  items jsonb NOT NULL DEFAULT '[]',
  recipes jsonb,
  cuisine text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fridge_scans TO authenticated;
GRANT ALL ON public.fridge_scans TO service_role;

ALTER TABLE public.fridge_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scans" ON public.fridge_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scans" ON public.fridge_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scans" ON public.fridge_scans FOR DELETE USING (auth.uid() = user_id);

-- Storage RLS policies for fridge-photos bucket
CREATE POLICY "Users can upload their own fridge photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fridge-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own fridge photos" ON storage.objects FOR SELECT USING (bucket_id = 'fridge-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own fridge photos" ON storage.objects FOR DELETE USING (bucket_id = 'fridge-photos' AND auth.uid() IS NOT NULL);