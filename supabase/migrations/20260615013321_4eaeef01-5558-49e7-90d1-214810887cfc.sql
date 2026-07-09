-- Deny all client-side writes on referral_codes and referrals.
-- The Stripe webhook and server functions use the service_role key,
-- which bypasses RLS, so backend writes continue to work.

CREATE POLICY "Block client inserts on referral_codes"
  ON public.referral_codes FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Block client updates on referral_codes"
  ON public.referral_codes FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on referral_codes"
  ON public.referral_codes FOR DELETE TO authenticated, anon
  USING (false);

CREATE POLICY "Block client inserts on referrals"
  ON public.referrals FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Block client updates on referrals"
  ON public.referrals FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on referrals"
  ON public.referrals FOR DELETE TO authenticated, anon
  USING (false);