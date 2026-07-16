import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListenerRequest, Track } from "@/lib/domain";
import { produceProgram, type ProductionProvider } from "@/lib/production";
import { ProgramStore } from "@/lib/program-store";

const request: ListenerRequest = {
  radioName: "Maya",
  message: "I finally moved to a new city and need a brave first-night song.",
};

const track: Track = {
  id: "local-preview",
  youtubeVideoId: "mock-preview",
  title: "Track to be selected",
  artist: "Local preview",
  durationMs: 60_000,
  startSeconds: 0,
  endSeconds: 12,
  tags: ["preview"],
  mood: ["warm"],
  hasVocals: false,
  licenseUrl: "https://example.com/license-pending",
  sourceUrl: "https://example.com/track-pending",
};

function provider(overrides: Partial<ProductionProvider> = {}): ProductionProvider {
  return {
    moderate: vi.fn().mockResolvedValue({ flagged: false }),
    plan: vi.fn().mockResolvedValue({
      introScript: "Maya, tonight this frequency belongs to your new beginning.",
      outroScript: "Keep the dial right here and keep going.",
      track,
    }),
    synthesize: vi
      .fn()
      .mockResolvedValueOnce({
        assetId: "intro",
        audioUrl: "/api/audio/intro",
        durationMs: 8_000,
      })
      .mockResolvedValueOnce({
        assetId: "outro",
        audioUrl: "/api/audio/outro",
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

  afterEach(() => {
    store.close();
  });

  it("produces a READY program with a scheduled, gap-free timeline", async () => {
    await produceProgram("program-1", {
      store,
      provider: provider(),
      now: () => 1_721_101_200_000,
    });

    const program = store.get("program-1");
    expect(program).toMatchObject({
      status: "READY",
      readyAt: 1_721_101_200_000,
      startsAt: 1_721_101_215_000,
    });
    expect(program?.timeline?.segments.map((segment) => segment.type)).toEqual([
      "SPEECH",
      "YOUTUBE",
      "SPEECH",
    ]);
  });

  it("rejects a moderated request before planning or synthesis", async () => {
    const blockedProvider = provider({
      moderate: vi.fn().mockResolvedValue({ flagged: true, reason: "unsafe request" }),
    });

    await produceProgram("program-1", { store, provider: blockedProvider });

    expect(store.get("program-1")).toMatchObject({
      status: "FAILED",
      errorCode: "REQUEST_REJECTED",
    });
    expect(blockedProvider.plan).not.toHaveBeenCalled();
    expect(blockedProvider.synthesize).not.toHaveBeenCalled();
  });

  it("turns provider failures into a stable production error", async () => {
    await produceProgram("program-1", {
      store,
      provider: provider({ plan: vi.fn().mockRejectedValue(new Error("provider unavailable")) }),
    });

    expect(store.get("program-1")).toMatchObject({
      status: "FAILED",
      errorCode: "PRODUCTION_UNAVAILABLE",
      errorMessage: "The show could not be produced. Please try again.",
    });
  });
});
