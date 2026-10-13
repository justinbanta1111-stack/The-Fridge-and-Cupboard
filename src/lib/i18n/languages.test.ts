import { describe, expect, test } from "bun:test";
import { detectLanguage } from "./languages";

describe("English session language", () => {
  test("does not switch for a Spanish phone locale", () => {
    expect(detectLanguage(["es-MX", "es"])).toBe("en");
  });
  test("does not switch for multilingual phone locales", () => {
    expect(detectLanguage(["fr-FR", "ar", "en-US"])).toBe("en");
  });
});