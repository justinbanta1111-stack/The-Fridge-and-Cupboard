CREATE TABLE public.scan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES public.fridge_scans(id) ON DELETE SET NULL,
  image_path text,
  storage text,
  original_name text NOT NULL,
  original_freshness text,
  original_estimated_age text,
  corrected_name text,
  corrected_freshness text,
  corrected_estimated_age text,
  corrected_time_left_label text,
  note text,
  share_image boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.scan_feedback TO authenticated;
GRANT ALL ON public.scan_feedback TO service_role;

ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON public.scan_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON public.scan_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX scan_feedback_user_id_created_at_idx
  ON public.scan_feedback (user_id, created_at DESC);