import { createServerFn } from "@tanstack/react-start";

export const transcribeVoice = createServerFn({ method: "POST" })
  .inputValidator((input: { audioBase64: string; mimeType: string }) => {
    if (!input || typeof input.audioBase64 !== "string" || typeof input.mimeType !== "string") {
      throw new Error("audioBase64 and mimeType are required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Decode base64 → bytes.
    const bin = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const baseMime = (data.mimeType.split(";")[0] || "").toLowerCase();
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/x-m4a": "m4a",
      "audio/m4a": "m4a",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/ogg": "ogg",
    };
    const ext = extMap[baseMime] ?? "webm";

    const form = new FormData();
    form.append("model", "openai/gpt-4o-transcribe");
    form.append("file", new Blob([bin], { type: data.mimeType }), `recording.${ext}`);

    console.info("TRANSCRIPTION_API_CALLED", { mimeType: baseMime, ext, bytes: bin.byteLength });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Transcription failed: ${res.status} ${errText}`);
    }
    const json = (await res.json()) as { text?: string };
    console.info("TRANSCRIPTION_API_SUCCESS", { hasText: !!json.text, chars: (json.text ?? "").length });
    return { text: (json.text ?? "").trim() };
  });
