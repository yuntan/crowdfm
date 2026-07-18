import { describe, expect, it } from "vitest";

import {
  DISPLAY_STAGE_COPY,
  READY_LEAD_TIME_MS,
  RequestSchema,
  TrackSchema,
  createProgramTimeline,
  cueAtElapsedTime,
  scheduledStartAfterReady,
  toDisplayStage,
  type Track,
} from "@/lib/domain";

export const generatedTrack: Track = {
  id: "quiet-victory",
  title: "Small Win Tonight",
  displayArtist: "CrowdFM Original",
  audioPath: "assets/58e0cf9b-c386-486b-9690-73032461604e.mp3",
  durationMs: 87_800,
  excerptStartMs: 0,
  excerptEndMs: 30_000,
  tags: ["instrumental", "downtempo"],
  mood: ["calm", "hopeful", "warm"],
  hasVocals: false,
  editorialNotes: ["Quiet satisfaction after completing something difficult"],
  provenance: {
    provider: "SUNO",
    songId: "58e0cf9b-c386-486b-9690-73032461604e",
    sourceUrl: "https://suno.com/song/58e0cf9b-c386-486b-9690-73032461604e",
    generatedAt: "2026-07-17T15:44:06+09:00",
    generationPrompt: "Warm downtempo instrumental.",
    model: "v5.5",
    planAtGeneration: "Pro Plan",
    rightsEvidencePath: "data/suno-generation-2026-07-17.md",
  },
  verifiedFacts: [],
};

describe("RequestSchema", () => {
  it("trims and accepts the two-field listener request", () => {
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

  it("enforces radioName 1–30 and message 20–760 after trimming", () => {
    expect(() => RequestSchema.parse({ radioName: " ", message: "x".repeat(20) })).toThrow();
    expect(() => RequestSchema.parse({ radioName: "x".repeat(31), message: "x".repeat(20) })).toThrow();
    expect(() => RequestSchema.parse({ radioName: "Maya", message: "x".repeat(19) })).toThrow();
    expect(() => RequestSchema.parse({ radioName: "Maya", message: "x".repeat(761) })).toThrow();
  });
});

describe("TrackSchema", () => {
  it("accepts a rights-recorded local Suno excerpt", () => {
    expect(TrackSchema.parse(generatedTrack)).toEqual(generatedTrack);
  });

  it("rejects nonzero starts, out-of-range ends, and paths outside assets", () => {
    expect(() => TrackSchema.parse({ ...generatedTrack, excerptStartMs: 1 })).toThrow();
    expect(() => TrackSchema.parse({ ...generatedTrack, excerptEndMs: 87_801 })).toThrow();
    expect(() => TrackSchema.parse({ ...generatedTrack, audioPath: "../secret.mp3" })).toThrow();
  });
});

describe("program scheduling", () => {
  it("starts exactly 15 seconds after READY", () => {
    const readyAt = Date.parse("2026-07-16T03:00:00.000Z");
    expect(READY_LEAD_TIME_MS).toBe(15_000);
    expect(scheduledStartAfterReady(readyAt)).toBe(readyAt + 15_000);
  });

  it("builds gap-free HOST → MUSIC → HOST cues over one final audio asset", () => {
    const timeline = createProgramTimeline({
      finalAudio: { audioUrl: "/api/audio/program-1", durationMs: 42_000 },
      intro: { transcript: "Welcome, Maya.", durationMs: 8_000 },
      track: generatedTrack,
      outro: { transcript: "Thanks for listening.", durationMs: 4_000 },
    });

    expect(timeline).toMatchObject({
      audioUrl: "/api/audio/program-1",
      durationMs: 42_000,
      isAiVoice: true,
    });
    expect(timeline.cues.map((cue) => [cue.type, cue.startsAtMs, cue.durationMs])).toEqual([
      ["HOST", 0, 8_000],
      ["MUSIC", 8_000, 30_000],
      ["HOST", 38_000, 4_000],
    ]);
    expect(cueAtElapsedTime(timeline, 8_000)?.type).toBe("MUSIC");
    expect(cueAtElapsedTime(timeline, 42_000)).toBeNull();
  });
});

describe("audience stages", () => {
  it("maps every internal state to the specified audience-facing stage", () => {
    expect(toDisplayStage("QUEUED")).toBe("CHECKING_REQUEST");
    expect(toDisplayStage("MODERATING")).toBe("CHECKING_REQUEST");
    expect(toDisplayStage("PLANNING")).toBe("PLANNING_SHOW");
    expect(toDisplayStage("SYNTHESIZING_SPEECH")).toBe("GENERATING_VOICE");
    expect(toDisplayStage("ASSEMBLING_AUDIO")).toBe("ASSEMBLING_SHOW");
    expect(toDisplayStage("READY")).toBe("READY");
    expect(toDisplayStage("ON_AIR")).toBe("ON_AIR");
    expect(toDisplayStage("ENDED")).toBe("ENDED");
    expect(toDisplayStage("FAILED")).toBe("FAILED");
    expect(DISPLAY_STAGE_COPY.ASSEMBLING_SHOW).toBe("Mixing the finished show");
  });
});
