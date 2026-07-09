
CREATE TABLE public.premium_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('recipe','ingredient','quick')),
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, title)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_favorites TO authenticated;
GRANT ALL ON public.premium_favorites TO service_role;

ALTER TABLE public.premium_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their favorites" ON public.premium_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their favorites" ON public.premium_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their favorites" ON public.premium_favorites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their favorites" ON public.premium_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER touch_premium_favorites_updated_at
  BEFORE UPDATE ON public.premium_favorites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_premium_favorites_user ON public.premium_favorites(user_id, created_at DESC);
