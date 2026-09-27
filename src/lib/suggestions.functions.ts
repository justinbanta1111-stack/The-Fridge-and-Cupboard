import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  message: z.string().trim().min(3).max(2000),
  contact: z.string().trim().max(200).optional(),
});

/**
 * Public suggestion box — no account required. Users share ideas, feature
 * requests, or anything they'd like the app to do.
 */
export const submitSuggestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("suggestions").insert({
      message: data.message,
      contact: data.contact || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
