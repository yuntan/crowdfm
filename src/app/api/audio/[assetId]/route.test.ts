import { describe, expect, it } from "vitest";

import { isValidAssetId } from "@/app/api/audio/[assetId]/route";

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
