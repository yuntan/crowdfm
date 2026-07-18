import { describe, expect, it } from "vitest";

import { isValidAssetId, parseByteRange } from "@/app/api/audio/[assetId]/route";

describe("audio asset IDs", () => {
  it("allows generated UUID-like IDs", () => {
    expect(isValidAssetId("2a44afea-2ff4-476e-8da6-3b4ba56c11e3")).toBe(true);
  });

  it("rejects path traversal and encoded path separators", () => {
    expect(isValidAssetId("../../.env")).toBe(false);
    expect(isValidAssetId("..%2F..%2F.env")).toBe(false);
    expect(isValidAssetId("folder/file")).toBe(false);
  });
});

describe("audio byte ranges", () => {
  it("parses bounded, open-ended, and suffix ranges", () => {
    expect(parseByteRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  });

  it("rejects unsatisfiable or multi-part ranges", () => {
    expect(parseByteRange("bytes=100-", 100)).toBeNull();
    expect(parseByteRange("bytes=20-10", 100)).toBeNull();
    expect(parseByteRange("bytes=0-1,4-5", 100)).toBeNull();
  });
});
