import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the currently authenticated user's account, including
 * all data covered by ON DELETE CASCADE (scans, savings, subscriptions, etc.)
 * via the auth.users foreign keys / row-level scoping by user_id.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    // Best-effort wipe of user-owned rows in tables that key on user_id but
    // do NOT have a foreign key cascade to auth.users.
    await supabase.from("savings_events").delete().eq("user_id", userId);
    await supabase.from("fridge_scans").delete().eq("user_id", userId);
    await supabase.from("subscriptions").delete().eq("user_id", userId);

    // Final step: delete the auth user itself (requires service role).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
