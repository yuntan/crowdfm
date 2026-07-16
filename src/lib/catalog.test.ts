import { describe, expect, it } from "vitest";

import { parseCatalog } from "@/lib/catalog";

const validTrack = {
  id: "licensed-one",
  youtubeVideoId: "video12345",
  title: "Licensed One",
  artist: "Example Artist",
  durationMs: 180_000,
  startSeconds: 0,
  endSeconds: 41,
  tags: ["hopeful"],
  mood: ["warm"],
  hasVocals: true,
  licenseUrl: "https://example.com/license",
  sourceUrl: "https://youtube.com/watch?v=video12345",
};

describe("parseCatalog", () => {
  it("accepts only validated, non-empty track catalogs", () => {
    expect(parseCatalog([validTrack])).toHaveLength(1);
    expect(() => parseCatalog([])).toThrow("at least one licensed track");
  });

  it("rejects a chorus boundary outside the source duration", () => {
    expect(() => parseCatalog([{ ...validTrack, endSeconds: 181 }])).toThrow();
  });
});
