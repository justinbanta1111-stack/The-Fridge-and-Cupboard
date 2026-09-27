CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'confirm-email-reminders',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://thefridgeandcupboard.com/api/public/email/confirmation-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-token', (SELECT token FROM public.email_reminder_jobs WHERE name = 'confirm-email-reminders')
    ),
    body := '{}'::jsonb
  );
  $$
);
