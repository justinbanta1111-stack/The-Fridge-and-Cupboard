import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the owner one alert the first time an account is seen signed in.
 * Purely additive: it never blocks or alters sign-up / sign-in, and a
 * duplicate call is a no-op thanks to the primary key on signup_alerts.
 */
export const notifyNewSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: existing } = await supabaseAdmin
        .from("signup_alerts")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) return { alerted: false as const };

      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
      const user = userRes?.user;
      if (!user || user.is_anonymous) return { alerted: false as const };

      // Claim the alert first so two tabs can't both send it.
      const { error: claimError } = await supabaseAdmin
        .from("signup_alerts")
        .insert({ user_id: userId, email: user.email ?? null });
      if (claimError) return { alerted: false as const };

      const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
      const signedUpAt = user.created_at
        ? new Date(user.created_at).toLocaleString("en-US", {
            timeZone: "America/Anchorage",
            dateStyle: "medium",
            timeStyle: "short",
          })
        : undefined;

      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("new-signup", "", {
        templateData: {
          userEmail: user.email ?? "Not provided",
          signedUpAt,
          method: provider === "email" ? "Email and password" : provider,
        },
        idempotencyKey: `new-signup-${userId}`,
      });

      return { alerted: true as const };
    } catch (error) {
      console.error("[signup-alert] failed", error);
      return { alerted: false as const };
    }
  });
