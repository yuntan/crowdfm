import { describe, expect, it } from "vitest";

import { parseCatalog } from "@/lib/catalog";

const generatedTrack = {
  id: "quiet-victory",
  title: "Small Win Tonight",
  displayArtist: "CrowdFM Original",
  audioPath: "assets/58e0cf9b-c386-486b-9690-73032461604e.mp3",
  durationMs: 87_800,
  excerptStartMs: 0,
  excerptEndMs: 30_000,
  tags: ["instrumental"],
  mood: ["calm"],
  hasVocals: false,
  editorialNotes: ["Quiet victory"],
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

describe("parseCatalog", () => {
  it("accepts a non-empty generated-track catalog", () => {
    expect(parseCatalog([generatedTrack])).toHaveLength(1);
    expect(() => parseCatalog([])).toThrow("at least one rights-verified track");
  });

  it("rejects an excerpt beyond the local source duration", () => {
    expect(() => parseCatalog([{ ...generatedTrack, excerptEndMs: 87_801 }])).toThrow();
  });
});
