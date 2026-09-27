ALTER TABLE public.food_preferences
  ADD COLUMN IF NOT EXISTS medical_conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cannot_eat text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fasting_requirements text[] NOT NULL DEFAULT '{}';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_preferences TO authenticated;
GRANT ALL ON public.food_preferences TO service_role;

ALTER TABLE public.food_preferences
  DROP CONSTRAINT IF EXISTS food_preferences_restriction_limits,
  ADD CONSTRAINT food_preferences_restriction_limits CHECK (
    cardinality(diets) <= 30
    AND cardinality(allergies) <= 30
    AND cardinality(dislikes) <= 50
    AND cardinality(favorite_cuisines) <= 30
    AND cardinality(medical_conditions) <= 30
    AND cardinality(cannot_eat) <= 50
    AND cardinality(fasting_requirements) <= 30
    AND length(notes) <= 1000
    AND household_size BETWEEN 1 AND 20
    AND spice_level BETWEEN 0 AND 5
  );