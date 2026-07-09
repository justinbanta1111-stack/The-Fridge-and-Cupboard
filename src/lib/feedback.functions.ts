import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FRESHNESS = z.enum(["fresh", "use-soon", "questionable", "throw-out"]);

const SubmitFeedbackInput = z.object({
  original: z.object({
    name: z.string().min(1),
    freshness: FRESHNESS.optional(),
    estimatedAge: z.string().optional(),
  }),
  corrected: z.object({
    name: z.string().optional(),
    freshness: FRESHNESS.optional(),
    estimatedAge: z.string().optional(),
    timeLeftLabel: z.string().optional(),
  }),
  storage: z.string().optional(),
  note: z.string().max(500).optional(),
  shareImage: z.boolean().optional(),
  // Either a freshly-scanned image (data URL) or a previously saved scan id.
  imageDataUrl: z.string().min(10).optional(),
  scanId: z.string().uuid().optional(),
});

function dataUrlToBuffer(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid image data URL");
  return Buffer.from(base64, "base64");
}

export const submitScanFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitFeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let imagePath: string | null = null;

    if (data.shareImage && data.imageDataUrl) {
      const feedbackId = crypto.randomUUID();
      imagePath = `${userId}/feedback/${feedbackId}.jpg`;
      const buffer = dataUrlToBuffer(data.imageDataUrl);
      const { error: uploadError } = await supabase.storage
        .from("fridge-photos")
        .upload(imagePath, buffer, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
    } else if (data.shareImage && data.scanId) {
      // Reuse the existing saved scan's image.
      const { data: scan, error } = await supabase
        .from("fridge_scans")
        .select("image_path")
        .eq("id", data.scanId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      imagePath = scan?.image_path ?? null;
    }

    const { error: insertError } = await supabase.from("scan_feedback").insert({
      user_id: userId,
      scan_id: data.scanId ?? null,
      image_path: imagePath,
      storage: data.storage ?? null,
      original_name: data.original.name,
      original_freshness: data.original.freshness ?? null,
      original_estimated_age: data.original.estimatedAge ?? null,
      corrected_name: data.corrected.name ?? null,
      corrected_freshness: data.corrected.freshness ?? null,
      corrected_estimated_age: data.corrected.estimatedAge ?? null,
      corrected_time_left_label: data.corrected.timeLeftLabel ?? null,
      note: data.note ?? null,
      share_image: !!data.shareImage,
    });

    if (insertError) throw new Error(insertError.message);

    return { ok: true };
  });
