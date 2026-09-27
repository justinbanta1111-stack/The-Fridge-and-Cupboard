CREATE TABLE public.feedback_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.feedback_requests TO service_role;
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.user_activity_summary
WITH (security_invoker = true) AS
SELECT user_id, min(created_at) AS first_activity_at, count(*) AS activity_count
FROM (
  SELECT user_id, created_at FROM public.fridge_scans
  UNION ALL
  SELECT user_id, created_at FROM public.savings_events
  UNION ALL
  SELECT user_id, created_at FROM public.premium_favorites
  UNION ALL
  SELECT user_id, created_at FROM public.dish_photos
  UNION ALL
  SELECT user_id, created_at FROM public.community_recipes
) activity
GROUP BY user_id;

GRANT SELECT ON public.user_activity_summary TO service_role;
