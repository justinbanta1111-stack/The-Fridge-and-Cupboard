import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase as anonSupabase } from "@/integrations/supabase/client";

const SubmitInput = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(500),
  ingredients: z.array(z.string().trim().min(1).max(120)).min(1).max(40),
  steps: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
  cuisine: z.string().trim().max(40).optional(),
  imageUrl: z.string().url().max(500).optional(),
});

export type CommunityRecipe = {
  id: string;
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  cuisine: string | null;
  imageUrl: string | null;
  upvotes: number;
  chefApproved: boolean;
  createdAt: string;
  authorIsMe: boolean;
  iVoted: boolean;
};

export const submitCommunityRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("community_recipes")
      .insert({
        user_id: userId,
        title: data.title,
        summary: data.summary,
        ingredients: data.ingredients,
        steps: data.steps,
        cuisine: data.cuisine ?? null,
        image_url: data.imageUrl ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id };
  });

const ListInput = z.object({
  sort: z.enum(["new", "top", "approved"]).default("new"),
  limit: z.number().int().min(1).max(50).default(20),
});

export const listCommunityRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<CommunityRecipe[]> => {
    // Read with anon-capable client (RLS allows anon to read published)
    let query = anonSupabase
      .from("community_recipes")
      .select("id, user_id, title, summary, ingredients, steps, cuisine, image_url, upvotes, chef_approved, created_at")
      .eq("status", "published");

    if (data.sort === "top") query = query.order("upvotes", { ascending: false });
    else if (data.sort === "approved") {
      query = query.eq("chef_approved", true).order("upvotes", { ascending: false });
    } else query = query.order("created_at", { ascending: false });

    const { data: rows, error } = await query.limit(data.limit);
    if (error) throw new Error(error.message);

    const { data: sessionData } = await anonSupabase.auth.getUser();
    const me = sessionData?.user?.id ?? null;
    let myVotes = new Set<string>();
    if (me) {
      const ids = (rows ?? []).map((r) => r.id);
      if (ids.length) {
        const { data: votes } = await anonSupabase
          .from("recipe_votes")
          .select("recipe_id")
          .eq("user_id", me)
          .in("recipe_id", ids);
        myVotes = new Set((votes ?? []).map((v) => v.recipe_id));
      }
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      ingredients: Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [],
      steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
      cuisine: r.cuisine,
      imageUrl: r.image_url,
      upvotes: r.upvotes,
      chefApproved: r.chef_approved,
      createdAt: r.created_at,
      authorIsMe: me === r.user_id,
      iVoted: myVotes.has(r.id),
    }));
  });

const VoteInput = z.object({ recipeId: z.string().uuid() });

export const toggleRecipeUpvote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("recipe_votes")
      .select("id")
      .eq("recipe_id", data.recipeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("recipe_votes").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { voted: false };
    }
    const { error } = await supabase
      .from("recipe_votes")
      .insert({ recipe_id: data.recipeId, user_id: userId });
    if (error) throw new Error(error.message);
    return { voted: true };
  });
