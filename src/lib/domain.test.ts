import { describe, expect, it } from "vitest";

import {
  READY_LEAD_TIME_MS,
  RequestSchema,
  TrackSchema,
  createProgramTimeline,
  scheduledStartAfterReady,
  segmentAtElapsedTime,
  toDisplayStage,
} from "@/lib/domain";

const track = {
  id: "demo-track",
  youtubeVideoId: "video12345",
  title: "Demo Track",
  artist: "Demo Artist",
  durationMs: 180_000,
  startSeconds: 0,
  endSeconds: 42.5,
  tags: ["hopeful"],
  mood: ["warm"],
  hasVocals: true,
  licenseUrl: "https://example.com/license",
  sourceUrl: "https://youtube.com/watch?v=video12345",
};

describe("RequestSchema", () => {
  it("trims and accepts a complete listener request", () => {
    expect(
      RequestSchema.parse({
        radioName: "  Maya ",
        message: "  I finally moved to a new city and need a brave first-night song.  ",
      }),
    ).toEqual({
      radioName: "Maya",
      message: "I finally moved to a new city and need a brave first-night song.",
    });
  });

  it("rejects whitespace-only or undersized fields", () => {
    expect(() => RequestSchema.parse({ radioName: "   ", message: "too short" })).toThrow();
  });
});

describe("TrackSchema", () => {
  it("accepts an excerpt that ends within the source duration", () => {
    expect(TrackSchema.parse(track).endSeconds).toBe(42.5);
  });

  it("rejects backwards and out-of-range excerpt boundaries", () => {
    expect(() => TrackSchema.parse({ ...track, startSeconds: 50 })).toThrow();
    expect(() => TrackSchema.parse({ ...track, endSeconds: 181 })).toThrow();
  });
});

describe("program scheduling", () => {
  it("starts exactly 15 seconds after READY", () => {
    const readyAt = Date.parse("2026-07-16T03:00:00.000Z");
    expect(READY_LEAD_TIME_MS).toBe(15_000);
    expect(scheduledStartAfterReady(readyAt)).toBe(readyAt + 15_000);
  });

  it("builds a gap-free speech → excerpt → speech timeline", () => {
    const timeline = createProgramTimeline({
      intro: {
        assetId: "intro",
        audioUrl: "/api/audio/intro",
        transcript: "Welcome, Maya.",
        durationMs: 8_000,
      },
      track,
      outro: {
        assetId: "outro",
        audioUrl: "/api/audio/outro",
        transcript: "Thanks for listening.",
        durationMs: 4_000,
      },
    });

    expect(timeline.durationMs).toBe(54_500);
    expect(timeline.segments.map((segment) => [segment.type, segment.startsAtMs, segment.durationMs])).toEqual([
      ["SPEECH", 0, 8_000],
      ["YOUTUBE", 8_000, 42_500],
      ["SPEECH", 50_500, 4_000],
    ]);
    expect(segmentAtElapsedTime(timeline, 8_000)?.type).toBe("YOUTUBE");
    expect(segmentAtElapsedTime(timeline, 54_500)).toBeNull();
  });
});

describe("toDisplayStage", () => {
  it("keeps detailed server states behind four stable listener stages", () => {
    expect(toDisplayStage("MODERATING")).toBe("Checking your request");
    expect(toDisplayStage("SYNTHESIZING_POST_TRACK")).toBe("Giving the host a voice");
    expect(toDisplayStage("READY")).toBe("Your show is ready");
    expect(toDisplayStage("FAILED")).toBe("Production stopped");
  });
});
