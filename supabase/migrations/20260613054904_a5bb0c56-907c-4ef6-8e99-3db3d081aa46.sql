-- ============== REFERRALS ==============
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  reward_applied BOOLEAN NOT NULL DEFAULT false,
  reward_applied_at TIMESTAMPTZ,
  stripe_coupon_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they sent"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE OR REPLACE FUNCTION public.touch_referral_code_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_referral_code_updated_at();

-- ============== COMMUNITY RECIPE VAULT ==============
CREATE TABLE public.community_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 500),
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  cuisine TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending','published','hidden')),
  chef_approved BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_recipes_status_created ON public.community_recipes(status, created_at DESC);
CREATE INDEX idx_community_recipes_upvotes ON public.community_recipes(upvotes DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_recipes TO authenticated;
GRANT SELECT ON public.community_recipes TO anon;
GRANT ALL ON public.community_recipes TO service_role;

ALTER TABLE public.community_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published recipes"
  ON public.community_recipes FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Authors can read their own recipes"
  ON public.community_recipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit their own recipes"
  ON public.community_recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND chef_approved = false);

CREATE POLICY "Authors can edit non-chef-fields on their recipes"
  ON public.community_recipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND chef_approved = (SELECT chef_approved FROM public.community_recipes WHERE id = community_recipes.id));

CREATE POLICY "Authors can delete their own recipes"
  ON public.community_recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_community_recipes_updated_at
  BEFORE UPDATE ON public.community_recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.recipe_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.community_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

CREATE INDEX idx_recipe_votes_recipe ON public.recipe_votes(recipe_id);

GRANT SELECT, INSERT, DELETE ON public.recipe_votes TO authenticated;
GRANT ALL ON public.recipe_votes TO service_role;

ALTER TABLE public.recipe_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own votes"
  ON public.recipe_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can vote as themselves"
  ON public.recipe_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unvote"
  ON public.recipe_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Maintain upvotes counter
CREATE OR REPLACE FUNCTION public.recipe_votes_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_recipes SET upvotes = upvotes + 1 WHERE id = NEW.recipe_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recipe_votes_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_recipes SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.recipe_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_recipe_votes_after_insert
  AFTER INSERT ON public.recipe_votes
  FOR EACH ROW EXECUTE FUNCTION public.recipe_votes_after_insert();

CREATE TRIGGER trg_recipe_votes_after_delete
  AFTER DELETE ON public.recipe_votes
  FOR EACH ROW EXECUTE FUNCTION public.recipe_votes_after_delete();