DROP POLICY IF EXISTS "Authors can edit non-chef-fields on their recipes" ON public.community_recipes;

CREATE POLICY "Authors can edit non-chef-fields on their recipes"
  ON public.community_recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND chef_approved = (SELECT cr.chef_approved FROM public.community_recipes cr WHERE cr.id = community_recipes.id)
    AND upvotes = (SELECT cr.upvotes FROM public.community_recipes cr WHERE cr.id = community_recipes.id)
  );