import { describe, expect, test } from "bun:test";
import { originalChefVoiceId, CHEF_VOICE_MODEL, CHEF_VOICE_SETTINGS } from "./chef-voice-settings";

describe("consistent relaxed Chef delivery", () => {
  test("keeps the fast response model", () => {
    expect(CHEF_VOICE_MODEL).toBe("eleven_turbo_v2_5");
  });
  test("uses a slightly slower synthesis pace rather than delaying startup", () => {
    expect(CHEF_VOICE_SETTINGS.speed).toBe(0.94);
  });
  test("restrains exaggerated delivery", () => {
    expect(CHEF_VOICE_SETTINGS.style).toBe(0);
    expect(CHEF_VOICE_SETTINGS.stability).toBe(0.8);
  });
  test("preserves the exact configured original voice", () => {
    expect(originalChefVoiceId(" original-custom-voice ")).toBe("original-custom-voice");
    expect(CHEF_VOICE_SETTINGS.similarity_boost).toBe(0.9);
    expect(CHEF_VOICE_SETTINGS.use_speaker_boost).toBe(true);
  });
  test("never substitutes a voice when the original is missing", () => {
    expect(() => originalChefVoiceId(undefined)).toThrow();
    expect(() => originalChefVoiceId(" ")).toThrow();
  });
});