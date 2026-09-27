import { createFileRoute } from '@tanstack/react-router';

/**
 * Sends friendly "please confirm your email" reminders to accounts that were
 * created but never confirmed:
 *   - one reminder once the account is at least 24 hours old
 *   - one final reminder once it is at least 3 days old
 *
 * Called hourly by a scheduled database job. Authentication is a token stored
 * in the database (public.email_reminder_jobs), sent as the x-reminder-token
 * header. Nothing here touches signup, sign-in, or subscriptions.
 */

const JOB_NAME = 'confirm-email-reminders';
const SITE = 'https://thefridgeandcupboard.com';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SENDS_PER_RUN = 50;
/** Days after a user's first real activity before we ask for feedback. */
const FEEDBACK_AFTER_DAYS = 3;

// Confirmation reminders are intentionally limited to the closed-test group.
// Keep this separate from signup/auth so accounts outside the group are untouched.
const CONFIRMATION_TESTER_EMAILS = new Set([
  'aptosdad@gmail.com',
  'dancetothepipes@gmail.com',
  'gangus247@protonmail.com',
  'lanabonna12@gmail.com',
  'prw8bk5pg8@privaterelay.appleid.com',
  'ruthannjones@aol.com',
  'tammyhull8718@gmail.com',
  'tammyki8718@yahoo.com',
  'wtpfff8vx5@privaterelay.appleid.com',
  'wz2gt559hg@privaterelay.appleid.com',
]);

type Row = {
  user_id: string;
  first_sent_at: string | null;
  final_sent_at: string | null;
};

async function run(request: Request) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const provided = request.headers.get('x-reminder-token') ?? '';
  const { data: job } = await supabaseAdmin
    .from('email_reminder_jobs')
    .select('token')
    .eq('name', JOB_NAME)
    .maybeSingle();

  const expected = (job as { token?: string } | null)?.token ?? '';
  if (!expected || provided !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { sendTemplateEmail } = await import('@/lib/email-templates/send-email');

  const { data: existingRows } = await supabaseAdmin
    .from('confirmation_reminders')
    .select('user_id, first_sent_at, final_sent_at');
  const byUser = new Map<string, Row>();
  for (const row of (existingRows ?? []) as Row[]) byUser.set(row.user_id, row);

  const now = Date.now();
  let firstSent = 0;
  let finalSent = 0;
  let skipped = 0;
  let failed = 0;
  const confirmedEmails = new Map<string, string>();


  for (let page = 1; page <= 10; page++) {
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !list?.users?.length) break;

    for (const user of list.users) {
      if (firstSent + finalSent >= MAX_SENDS_PER_RUN) break;
      if (!user.email || (user as { is_anonymous?: boolean }).is_anonymous) continue;
      if (user.email_confirmed_at) {
        confirmedEmails.set(user.id, user.email);
        continue;
      }
      if (!CONFIRMATION_TESTER_EMAILS.has(user.email.toLowerCase())) continue;

      const ageMs = now - new Date(user.created_at).getTime();
      const record = byUser.get(user.id);

      let stage: 'first' | 'final' | null = null;
      if (ageMs >= 3 * DAY_MS && !record?.final_sent_at) stage = 'final';
      else if (ageMs >= DAY_MS && !record?.first_sent_at) stage = 'first';
      if (!stage) continue;

      try {
        const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email,
          options: { redirectTo: `${SITE}/` },
        });
        const confirmUrl = link?.properties?.action_link;
        if (linkError || !confirmUrl) {
          failed++;
          continue;
        }

        const result = await sendTemplateEmail('confirm-email-reminder', user.email, {
          templateData: { confirmUrl, isFinal: stage === 'final' },
          idempotencyKey: `confirm-reminder-${stage}-${user.id}`,
        });

        const patch: {
          user_id: string;
          email: string;
          updated_at: string;
          first_sent_at?: string;
          final_sent_at?: string;
        } = {
          user_id: user.id,
          email: user.email,
          updated_at: new Date().toISOString(),
        };
        if (stage === 'final') {
          patch['final_sent_at'] = new Date().toISOString();
          patch['first_sent_at'] = record?.first_sent_at ?? new Date().toISOString();
        } else {
          patch['first_sent_at'] = new Date().toISOString();
        }
        await supabaseAdmin.from('confirmation_reminders').upsert(patch, { onConflict: 'user_id' });

        if (!result.sent) skipped++;
        else if (stage === 'final') finalSent++;
        else firstSent++;
      } catch (err) {
        failed++;
        console.error('[confirm-reminder] send failed', err);
      }
    }

    if (list.users.length < 200) break;
  }

  // --- Feedback request: confirmed users who have actually used the app ---
  let feedbackSent = 0;
  try {
    const { data: activity } = await supabaseAdmin
      .from('user_activity_summary')
      .select('user_id, first_activity_at')
      .lte('first_activity_at', new Date(now - FEEDBACK_AFTER_DAYS * DAY_MS).toISOString());

    const { data: alreadyAsked } = await supabaseAdmin
      .from('feedback_requests')
      .select('user_id');
    const asked = new Set(((alreadyAsked ?? []) as { user_id: string }[]).map((r) => r.user_id));

    for (const row of (activity ?? []) as { user_id: string | null }[]) {
      if (feedbackSent >= MAX_SENDS_PER_RUN) break;
      const userId = row.user_id;
      if (!userId || asked.has(userId)) continue;
      const email = confirmedEmails.get(userId);
      if (!email) continue;

      const { error: claimError } = await supabaseAdmin
        .from('feedback_requests')
        .insert({ user_id: userId, email });
      if (claimError) continue;

      try {
        await sendTemplateEmail('feedback-request', email, {
          templateData: { feedbackUrl: `${SITE}/` },
          idempotencyKey: `feedback-request-${userId}`,
        });
        feedbackSent++;
      } catch (err) {
        failed++;
        console.error('[feedback-request] send failed', err);
      }
    }
  } catch (err) {
    console.error('[feedback-request] pass failed', err);
  }

  return Response.json({ ok: true, firstSent, finalSent, feedbackSent, skipped, failed });
}

export const Route = createFileRoute('/api/public/email/confirmation-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
    },
  },
});
