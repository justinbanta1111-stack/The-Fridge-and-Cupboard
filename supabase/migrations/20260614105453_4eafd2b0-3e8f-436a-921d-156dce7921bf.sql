DROP POLICY IF EXISTS "Authors can edit non-chef-fields on their recipes" ON public.community_recipes;

CREATE POLICY "Authors can edit non-chef-fields on their recipes"
ON public.community_recipes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND chef_approved = (
    SELECT cr.chef_approved
    FROM public.community_recipes cr
    WHERE cr.id = public.community_recipes.id
  )
);