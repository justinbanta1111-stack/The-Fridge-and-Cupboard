import { describe, expect, test } from "bun:test";
import { CHEF_VOICE_MODEL, CHEF_VOICE_SETTINGS } from "./chef-voice-settings";

describe("consistent relaxed Chef delivery", () => {
  test("keeps the fast response model", () => {
    expect(CHEF_VOICE_MODEL).toBe("eleven_turbo_v2_5");
  });
  test("uses a slightly slower synthesis pace rather than delaying startup", () => {
    expect(CHEF_VOICE_SETTINGS.speed).toBe(0.94);
  });
  test("restrains exaggerated delivery", () => {
    expect(CHEF_VOICE_SETTINGS.style).toBe(0.1);
    expect(CHEF_VOICE_SETTINGS.stability).toBe(0.65);
  });
});