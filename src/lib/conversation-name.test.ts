import { describe, expect, test } from "bun:test";
import { conversationNameUsage } from "./conversation-name";

describe("saved names in spoken follow-ups", () => {
  test("uses the saved name beyond the greeting", () => {
    expect(conversationNameUsage("Maria", [{ role: "assistant", text: "Let's use that leftover chicken." }]))
      .toEqual({ name: "Maria", useName: true });
  });
  test("avoids repeating the name in consecutive replies", () => {
    expect(conversationNameUsage("Maria", [{ role: "assistant", text: "Sounds good, Maria." }]).useName).toBe(false);
  });
  test("returns to name use after intervening replies", () => {
    expect(conversationNameUsage("Maria", [
      { role: "assistant", text: "Sounds good, Maria." },
      { role: "assistant", text: "Use the leftover chicken." },
      { role: "assistant", text: "Rice works with that too." },
    ]).useName).toBe(true);
  });
  test("current name replaces a different name in history", () => {
    expect(conversationNameUsage("Sam", [{ role: "assistant", text: "Sounds good, Maria." }]))
      .toEqual({ name: "Sam", useName: true });
  });
  test("unknown names are never filled from conversation history", () => {
    expect(conversationNameUsage(undefined, [{ role: "assistant", text: "Hello, Justin." }]))
      .toEqual({ name: "", useName: false });
  });
});