import { describe, expect, it } from "vitest";

import {
  SCRIPT_LENGTH_REQUIREMENTS,
  SCRIPT_PLATFORM_FORMATS,
} from "@/lib/script-generation/options";

describe("platform-aware script duration requirements", () => {
  it("classifies video and text platforms correctly", () => {
    expect(SCRIPT_PLATFORM_FORMATS.youtube).toBe("video");
    expect(SCRIPT_PLATFORM_FORMATS.instagram).toBe("video");
    expect(SCRIPT_PLATFORM_FORMATS.tiktok).toBe("video");
    expect(SCRIPT_PLATFORM_FORMATS.twitter).toBe("text");
    expect(SCRIPT_PLATFORM_FORMATS.linkedin).toBe("text");
    expect(SCRIPT_PLATFORM_FORMATS.facebook).toBe("text");
  });

  it("keeps every text preset longer than its video equivalent", () => {
    const video = SCRIPT_LENGTH_REQUIREMENTS.video;
    const text = SCRIPT_LENGTH_REQUIREMENTS.text;

    expect(text.really_short.minimumWords).toBeGreaterThan(
      video.really_short.minimumWords,
    );
    expect(text.medium.minimumWords).toBeGreaterThan(video.medium.minimumWords);
    expect(text.long.minimumWords).toBeGreaterThan(video.long.minimumWords);
  });

  it("uses reading time for text and recording time for video", () => {
    expect(SCRIPT_LENGTH_REQUIREMENTS.text.medium.timing).toContain("read");
    expect(SCRIPT_LENGTH_REQUIREMENTS.video.medium.timing).toContain("seconds");
  });

  it("increases generation token budgets with duration", () => {
    const video = SCRIPT_LENGTH_REQUIREMENTS.video;
    const text = SCRIPT_LENGTH_REQUIREMENTS.text;

    expect(video.really_short.maxOutputTokens).toBeLessThan(
      video.medium.maxOutputTokens,
    );
    expect(video.medium.maxOutputTokens).toBeLessThan(
      video.long.maxOutputTokens,
    );
    expect(text.really_short.maxOutputTokens).toBeLessThan(
      text.medium.maxOutputTokens,
    );
    expect(text.medium.maxOutputTokens).toBeLessThan(
      text.long.maxOutputTokens,
    );
  });

  it("gives text generation enough room for structured thread output", () => {
    expect(SCRIPT_LENGTH_REQUIREMENTS.text.medium.maxOutputTokens).toBe(8192);
    expect(SCRIPT_LENGTH_REQUIREMENTS.text.long.maxOutputTokens).toBe(12288);
  });
});
