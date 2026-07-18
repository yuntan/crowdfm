import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createProgramTimeline } from "@/lib/domain";
import { ProgramStore } from "@/lib/program-store";

const request = {
  radioName: "Maya",
  message: "I finally moved to a new city and need a brave first-night song.",
};

const timeline = createProgramTimeline({
  finalAudio: { audioUrl: "/api/audio/program", durationMs: 54_500 },
  intro: {
    transcript: "Welcome, Maya.",
    durationMs: 8_000,
  },
  track: {
    id: "demo-track",
    title: "Demo Track",
    displayArtist: "CrowdFM Original",
    audioPath: "assets/demo-track.mp3",
    durationMs: 180_000,
    excerptStartMs: 0,
    excerptEndMs: 42_500,
    tags: ["hopeful"],
    mood: ["warm"],
    hasVocals: true,
    editorialNotes: ["Warm and hopeful"],
    provenance: {
      provider: "SUNO",
      songId: "demo-track",
      sourceUrl: "https://suno.com/song/demo-track",
      generatedAt: "2026-07-17T15:44:06+09:00",
      generationPrompt: "Warm and hopeful.",
      planAtGeneration: "Pro Plan",
      rightsEvidencePath: "data/suno-generation-2026-07-17.md",
    },
    verifiedFacts: [],
  },
  outro: {
    transcript: "Thanks for listening.",
    durationMs: 4_000,
  },
});

describe("ProgramStore", () => {
  let store: ProgramStore;

  beforeEach(() => {
    store = new ProgramStore(":memory:", () => 1_721_101_200_000, () => "program-1");
  });

  afterEach(() => {
    store.close();
  });

  it("persists a validated listener request as QUEUED", () => {
    const created = store.create(request);

    expect(created).toMatchObject({
      id: "program-1",
      request,
      status: "QUEUED",
      createdAt: 1_721_101_200_000,
      updatedAt: 1_721_101_200_000,
    });
    expect(store.get("program-1")).toEqual(created);
  });

  it("compares the expected state before transitioning", () => {
    store.create(request);
    expect(store.transition("program-1", "MODERATING", "PLANNING")).toBeNull();
    expect(store.get("program-1")?.status).toBe("QUEUED");

    expect(store.transition("program-1", "QUEUED", "MODERATING")?.status).toBe("MODERATING");
  });

  it("stores the final timeline and exact ready schedule", () => {
    store.create(request);
    const readyAt = 1_721_101_200_000;
    const ready = store.transition("program-1", "QUEUED", "READY", {
      readyAt,
      startsAt: readyAt + 15_000,
      timeline,
    });

    expect(ready).toMatchObject({
      status: "READY",
      readyAt,
      startsAt: readyAt + 15_000,
      timeline,
    });
  });

  it("returns null for unknown programs", () => {
    expect(store.get("missing")).toBeNull();
  });
});
