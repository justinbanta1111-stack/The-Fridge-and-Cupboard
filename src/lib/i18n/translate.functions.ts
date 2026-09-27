import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { translateBatch } from "./translate.server";

const Input = z.object({
  texts: z.array(z.string().min(1).max(4000)).min(1).max(60),
  target: z.string().min(2).max(12),
});

export const translateStrings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ translations: string[] }> => {
    if (data.target.toLowerCase().startsWith("en")) {
      return { translations: data.texts };
    }
    return { translations: await translateBatch(data.texts, data.target) };
  });
