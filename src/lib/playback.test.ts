import { describe, expect, it } from "vitest";

import type { ProgramTimeline } from "@/lib/domain";
import { derivePlaybackState, estimateServerNow } from "@/lib/playback";

const timeline: ProgramTimeline = {
  audioUrl: "/api/audio/program-1",
  durationMs: 24_000,
  isAiVoice: true,
  cues: [
    { type: "HOST", startsAtMs: 0, durationMs: 8_000, transcript: "Welcome." },
    {
      type: "MUSIC",
      startsAtMs: 8_000,
      durationMs: 12_000,
      trackId: "quiet-victory",
      title: "Small Win Tonight",
      displayArtist: "CrowdFM Original",
    },
    { type: "HOST", startsAtMs: 20_000, durationMs: 4_000, transcript: "Good night." },
  ],
};

describe("estimateServerNow", () => {
  it("advances a server observation using client elapsed time", () => {
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

  it("returns the whole-program late-join offset and current display cue", () => {
    expect(derivePlaybackState(109_500, 100_000, timeline)).toMatchObject({
      phase: "live",
      elapsedMs: 9_500,
      cueOffsetMs: 1_500,
      cue: { type: "MUSIC" },
    });
  });

  it("ends exactly at the final-audio boundary", () => {
    expect(derivePlaybackState(124_000, 100_000, timeline)).toEqual({ phase: "ended" });
  });
});
