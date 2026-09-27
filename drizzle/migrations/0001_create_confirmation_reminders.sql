CREATE TABLE public.confirmation_reminders (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_sent_at timestamptz,
  final_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.confirmation_reminders TO service_role;
ALTER TABLE public.confirmation_reminders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.email_reminder_jobs (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_reminder_jobs TO service_role;
ALTER TABLE public.email_reminder_jobs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.email_reminder_jobs (name) VALUES ('confirm-email-reminders')
ON CONFLICT (name) DO NOTHING;
