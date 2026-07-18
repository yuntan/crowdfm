import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListenerRequest, Track } from "@/lib/domain";
import { produceProgram, type ProductionProvider } from "@/lib/production";
import { ProgramStore } from "@/lib/program-store";

const request: ListenerRequest = {
  radioName: "Maya",
  message: "I finally moved to a new city and need a brave first-night song.",
};

const generatedTrack: Track = {
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

function provider(overrides: Partial<ProductionProvider> = {}): ProductionProvider {
  return {
    moderate: vi.fn().mockResolvedValue({ flagged: false }),
    plan: vi.fn().mockResolvedValue({
      introScript: "Maya, tonight this frequency belongs to your new beginning.",
      outroScript: "Keep the dial right here and keep going.",
      track: generatedTrack,
    }),
    synthesize: vi
      .fn()
      .mockResolvedValueOnce({
        assetId: "intro",
        filePath: "generated/audio/intro.mp3",
        durationMs: 8_000,
      })
      .mockResolvedValueOnce({
        assetId: "outro",
        filePath: "generated/audio/outro.mp3",
        durationMs: 4_000,
      }),
    ...overrides,
  };
}

describe("produceProgram", () => {
  let store: ProgramStore;

  beforeEach(() => {
    store = new ProgramStore(":memory:", () => 1_721_101_200_000, () => "program-1");
    store.create(request);
  });

  afterEach(() => store.close());

  it("assembles one audio asset and schedules it exactly 15 seconds after READY", async () => {
    const assembler = {
      assemble: vi.fn().mockResolvedValue({
        assetId: "program-audio",
        audioUrl: "/api/audio/program-audio",
        filePath: "generated/audio/program-audio.mp3",
        durationMs: 42_000,
      }),
    };

    await produceProgram("program-1", {
      store,
      provider: provider(),
      assembler,
      now: () => 1_721_101_200_000,
    });

    expect(assembler.assemble).toHaveBeenCalledWith(expect.objectContaining({
      track: generatedTrack,
      intro: expect.objectContaining({ assetId: "intro" }),
      outro: expect.objectContaining({ assetId: "outro" }),
    }));
    expect(store.get("program-1")).toMatchObject({
      status: "READY",
      readyAt: 1_721_101_200_000,
      startsAt: 1_721_101_215_000,
      timeline: {
        audioUrl: "/api/audio/program-audio",
        isAiVoice: true,
        cues: [{ type: "HOST" }, { type: "MUSIC" }, { type: "HOST" }],
      },
    });
  });

  it("rejects a moderated request before planning or synthesis", async () => {
    const blockedProvider = provider({
      moderate: vi.fn().mockResolvedValue({ flagged: true, reason: "unsafe request" }),
    });
    const assembler = { assemble: vi.fn() };

    await produceProgram("program-1", { store, provider: blockedProvider, assembler });

    expect(store.get("program-1")).toMatchObject({ status: "FAILED", errorCode: "REQUEST_REJECTED" });
    expect(blockedProvider.plan).not.toHaveBeenCalled();
    expect(blockedProvider.synthesize).not.toHaveBeenCalled();
    expect(assembler.assemble).not.toHaveBeenCalled();
  });

  it("turns assembly failures into a stable production error", async () => {
    await produceProgram("program-1", {
      store,
      provider: provider(),
      assembler: { assemble: vi.fn().mockRejectedValue(new Error("ffmpeg failed")) },
    });

    expect(store.get("program-1")).toMatchObject({
      status: "FAILED",
      errorCode: "PRODUCTION_UNAVAILABLE",
      errorMessage: "The show could not be produced. Please try again.",
    });
  });
});
