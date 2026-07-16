import { describe, expect, it } from "vitest";

import { getRuntimeHealth } from "@/lib/health";

describe("getRuntimeHealth", () => {
  it("reports the local mock runtime by default", () => {
    expect(getRuntimeHealth({})).toEqual({
      mode: "mock",
      storage: "sqlite",
    });
  });

  it("reports OpenAI mode only when explicitly configured", () => {
    expect(getRuntimeHealth({ CROWDFM_PROVIDER: "openai" })).toEqual({
      mode: "openai",
      storage: "sqlite",
    });
  });
});
