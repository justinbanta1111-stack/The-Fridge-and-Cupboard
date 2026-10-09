import { describe, expect, test } from "bun:test";
import { cleanName, extractName, extractNameCorrection, greetingFor } from "./user-name";

describe("preferred name", () => {
  test("unknown name asks what to call them, never defaults to Justin", () => {
    expect(greetingFor("")).toBe("Welcome to The Fridge & Cupboard! What would you like me to call you?");
  });
  test("returning person is welcomed back by name", () => {
    expect(greetingFor("Maria")).toBe("Welcome back, Maria! What are we cooking today?");
  });
  test("spoken answers become names", () => {
    expect(extractName("Call me Sam.")).toBe("Sam");
    expect(extractName("my name is priya")).toBe("Priya");
    expect(extractName("Lee")).toBe("Lee");
  });
  test("non-answers and Chef's own names are not saved", () => {
    expect(extractName("no thanks")).toBe("");
    expect(extractName("what can I make with chicken")).toBe("");
    expect(cleanName("Chef")).toBe("");
  });
  test("corrections are recognised", () => {
    expect(extractNameCorrection("Actually, call me Tom")).toBe("Tom");
    expect(extractNameCorrection("I want Mexican food")).toBe("");
  });
});
