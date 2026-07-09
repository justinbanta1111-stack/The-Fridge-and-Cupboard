import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KindZ = z.enum(["recipe", "ingredient", "quick"]);

export type FavoriteKind = z.infer<typeof KindZ>;

export type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export type FavoriteRow = {
  id: string;
  kind: FavoriteKind;
  title: string;
  payload: JsonValue;
  created_at: string;
};

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteRow[]> => {
    const { data, error } = await context.supabase
      .from("premium_favorites")
      .select("id,kind,title,payload,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FavoriteRow[];
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: KindZ,
      title: z.string().min(1).max(200),
      payload: z.unknown(),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<FavoriteRow> => {
    const { data: row, error } = await context.supabase
      .from("premium_favorites")
      .upsert(
        { user_id: context.userId, kind: data.kind, title: data.title, payload: data.payload as JsonValue },
        { onConflict: "user_id,kind,title" },
      )
      .select("id,kind,title,payload,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as FavoriteRow;
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ kind: KindZ, title: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("premium_favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("kind", data.kind)
      .eq("title", data.title);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ImportItemZ = z.object({
  kind: KindZ,
  title: z.string().min(1).max(200),
  payload: z.unknown().optional().default({}),
});

export const importFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ items: z.array(ImportItemZ).min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ imported: number }> => {
    const rows = data.items.map((i) => ({
      user_id: context.userId,
      kind: i.kind,
      title: i.title,
      payload: (i.payload ?? {}) as JsonValue,
    }));
    const { error, data: inserted } = await context.supabase
      .from("premium_favorites")
      .upsert(rows, { onConflict: "user_id,kind,title" })
      .select("id");
    if (error) throw new Error(error.message);
    return { imported: inserted?.length ?? rows.length };
  });
