import { describe, expect, test } from "bun:test";
import { canPrepareWelcomeAudio } from "./welcome-voice";

describe("welcome playback ownership", () => {
  test("preparing audio is allowed before the welcome starts", () => {
    expect(canPrepareWelcomeAudio(false, false, false)).toBe(true);
  });
  test("an active greeting cannot be replaced by preload", () => {
    expect(canPrepareWelcomeAudio(false, true, true)).toBe(false);
  });
  test("a claimed channel cannot be replaced before audio starts", () => {
    expect(canPrepareWelcomeAudio(false, false, true)).toBe(false);
  });
  test("the welcome cannot be prepared again after completion", () => {
    expect(canPrepareWelcomeAudio(true, false, false)).toBe(false);
  });
});