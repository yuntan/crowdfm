import { describe, expect, it } from "vitest";

import type { ProgramTimeline } from "@/lib/domain";
import { derivePlaybackState, estimateServerNow } from "@/lib/playback";

const timeline: ProgramTimeline = {
  durationMs: 24_000,
  segments: [
    {
      type: "SPEECH",
      startsAtMs: 0,
      durationMs: 8_000,
      assetId: "intro",
      audioUrl: "/api/audio/intro",
      transcript: "Welcome.",
    },
    {
      type: "YOUTUBE",
      startsAtMs: 8_000,
      durationMs: 12_000,
      videoId: "mock-preview",
      startSeconds: 0,
      endSeconds: 12,
      title: "Preview",
      artist: "CrowdFM",
      sourceUrl: "https://example.com/source",
      licenseUrl: "https://example.com/license",
    },
    {
      type: "SPEECH",
      startsAtMs: 20_000,
      durationMs: 4_000,
      assetId: "outro",
      audioUrl: "/api/audio/outro",
      transcript: "Good night.",
    },
  ],
};

describe("estimateServerNow", () => {
  it("advances a server observation using monotonic client elapsed time", () => {
    expect(estimateServerNow(10_000, 2_000, 2_750)).toBe(10_750);
  });
});

describe("derivePlaybackState", () => {
  it("returns a precise countdown before airtime", () => {
    expect(derivePlaybackState(99_250, 100_000, timeline)).toEqual({
      phase: "countdown",
      remainingMs: 750,
    });
  });

  it("returns the active segment and late-join offset", () => {
    expect(derivePlaybackState(109_500, 100_000, timeline)).toMatchObject({
      phase: "live",
      elapsedMs: 9_500,
      segmentOffsetMs: 1_500,
      segment: { type: "YOUTUBE" },
    });
  });

  it("ends exactly at the timeline boundary", () => {
    expect(derivePlaybackState(124_000, 100_000, timeline)).toEqual({ phase: "ended" });
  });
});
