import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { HUMOR_RULES } from "./chef-humor-prompt";

const Turn = z.object({
  role: z.enum(["user", "chef"]),
  text: z.string().max(2000),
});

const Input = z.object({
  question: z.string().min(1).max(500),
  imageDataUrl: z.string().max(12_000_000).default(""),
  itemName: z.string().max(160).default(""),
  itemSummary: z.string().max(1200).default(""),
  products: z.array(z.string().max(160)).max(25).default([]),
  haveAtHome: z.array(z.string().max(60)).max(60).default([]),
  useUpSoon: z.array(z.string().max(60)).max(20).default([]),
  dietary: z.array(z.string().max(60)).max(30).default([]),
  storeName: z.string().max(120).default(""),
  history: z.array(Turn).max(12).default([]),
});

export type StoreAskResult = { answer: string };

const SYSTEM = [
  "You are Chef Super J, standing right next to the shopper in the grocery store while they hold their phone.",
  "They just photographed something and are asking you follow-up questions out loud. Answer like a person talking, not a document.",
  "You can see their photo. Refer to what is actually in it. Never invent brands, prices, or aisle numbers you cannot see or know.",
  "Answer the question they asked, first sentence first. 1 to 4 short spoken sentences. No markdown, no bullet lists, no headings, no emojis. Use contractions.",
  "You can compare products, recommend one, explain how to pick a good one, how to cook it, what goes with it, how to store it, rough value, and what meals it makes with what they already have.",
  "Dietary restrictions are absolute — never suggest something that breaks them.",
  "If they ask something you genuinely can't tell from the photo, say so plainly and tell them what to look for on the package.",
  "Keep the thread of the conversation: 'it', 'that one', 'the other one' refer to what you were just talking about.",
  ...HUMOR_RULES,
].join("\n");

export const askStoreChef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<StoreAskResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Chef's assistant isn't configured right now. Try again later.");

    const context = [
      data.itemName ? `What they scanned: ${data.itemName}` : "",
      data.itemSummary ? `What it is: ${data.itemSummary}` : "",
      data.products.length ? `Items visible in the photo: ${data.products.join(", ")}` : "",
      data.storeName ? `Store: ${data.storeName}` : "",
      data.haveAtHome.length ? `Already at home: ${data.haveAtHome.join(", ")}` : "",
      data.useUpSoon.length ? `Needs using up soon: ${data.useUpSoon.join(", ")}` : "",
      data.dietary.length ? `Dietary restrictions (absolute): ${data.dietary.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const messages: Parameters<typeof generateText>[0]["messages"] = [
      { role: "system", content: SYSTEM },
    ];

    for (const turn of data.history.slice(-8)) {
      messages.push({
        role: turn.role === "user" ? "user" : "assistant",
        content: turn.text,
      });
    }

    const userParts: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: `${context ? `${context}\n\n` : ""}They asked: ${data.question}` },
    ];
    if (data.imageDataUrl.startsWith("data:image")) {
      userParts.push({ type: "image", image: data.imageDataUrl });
    }
    messages.push({ role: "user", content: userParts });

    try {
      const { text } = await generateText({
        model: createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview"),
        maxRetries: 1,
        messages,
      });
      const answer = (text ?? "").trim();
      if (!answer) throw new Error("empty");
      return { answer: answer.slice(0, 1800) };
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      if (/\b429\b|rate.?limit/i.test(raw))
        throw new Error("Chef's got a line right now — ask me again in a moment.");
      if (/\b402\b|credits?/i.test(raw))
        throw new Error("Daily AI credits are used up. Try again tomorrow.");
      throw new Error("I didn't catch that one. Ask me again.");
    }
  });
