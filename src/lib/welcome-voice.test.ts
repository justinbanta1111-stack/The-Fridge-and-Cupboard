import { describe, expect, test } from "bun:test";
import { canPrepareWelcomeAudio, configureWelcomePlayback, WELCOME_VOICE_SETTINGS } from "./welcome-voice";
import { CHEF_VOICE_SETTINGS } from "./chef-voice-settings";

describe("gentle original-voice opening", () => {
  test("uses the response profile without slowing or shifting playback pitch", () => {
    expect(WELCOME_VOICE_SETTINGS).toBe(CHEF_VOICE_SETTINGS);
    expect(WELCOME_VOICE_SETTINGS.speed).toBe(0.94);
    const audio = { volume: 1, playbackRate: 1.5, defaultPlaybackRate: 1.5, preservesPitch: false };
    configureWelcomePlayback(audio);
    expect(audio.playbackRate).toBe(1);
    expect(audio.defaultPlaybackRate).toBe(1);
    expect(audio.preservesPitch).toBe(true);
  });
  test("plays the opening at the same normal volume as replies", () => {
    const audio = { volume: 1, playbackRate: 1, defaultPlaybackRate: 1, preservesPitch: true };
    configureWelcomePlayback(audio);
    expect(audio.volume).toBe(0.82);
  });
});

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