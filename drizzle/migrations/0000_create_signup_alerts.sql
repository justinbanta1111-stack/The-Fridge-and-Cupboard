CREATE TABLE public.signup_alerts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  notified_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.signup_alerts TO authenticated;
GRANT ALL ON public.signup_alerts TO service_role;

ALTER TABLE public.signup_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own signup alert row"
ON public.signup_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);