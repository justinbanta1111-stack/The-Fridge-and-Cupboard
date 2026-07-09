REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;

DROP POLICY IF EXISTS "Deny client inserts on subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Deny client updates on subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Deny client deletes on subscriptions" ON public.subscriptions;

CREATE POLICY "Deny client inserts on subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Deny client updates on subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on subscriptions"
  ON public.subscriptions FOR DELETE TO authenticated, anon
  USING (false);