
CREATE TABLE public.food_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  diets TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  favorite_cuisines TEXT[] NOT NULL DEFAULT '{}',
  spice_level SMALLINT NOT NULL DEFAULT 2 CHECK (spice_level BETWEEN 0 AND 5),
  household_size SMALLINT NOT NULL DEFAULT 2 CHECK (household_size BETWEEN 1 AND 20),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_preferences TO authenticated;
GRANT ALL ON public.food_preferences TO service_role;

ALTER TABLE public.food_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.food_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.food_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.food_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences" ON public.food_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER food_preferences_touch_updated_at
  BEFORE UPDATE ON public.food_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
