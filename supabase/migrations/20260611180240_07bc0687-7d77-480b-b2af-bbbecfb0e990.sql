CREATE TABLE public.savings_events (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null,
  recipe_title text not null,
  estimated_savings_cents integer not null default 600,
  pounds_rescued numeric not null default 0.5,
  source text not null default 'recipe',
  scan_id uuid references public.fridge_scans(id) on delete set null,
  cooked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_events TO authenticated;
GRANT ALL ON public.savings_events TO service_role;

ALTER TABLE public.savings_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own savings"
  ON public.savings_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings"
  ON public.savings_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings"
  ON public.savings_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX savings_events_user_cooked_idx ON public.savings_events (user_id, cooked_at DESC);