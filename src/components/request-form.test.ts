import { describe, expect, it } from "vitest";

import {
  REQUEST_EXAMPLES,
  pickRequestExample,
} from "@/components/request-form";
import { RequestSchema } from "@/lib/domain";

describe("request form examples", () => {
  it("provides several messages that satisfy the listener request contract", () => {
    expect(REQUEST_EXAMPLES.length).toBeGreaterThanOrEqual(5);
    for (const message of REQUEST_EXAMPLES) {
      expect(() => RequestSchema.parse({ radioName: "Maya", message })).not.toThrow();
    }
  });

  it("uses the supplied random value to select an example", () => {
    expect(pickRequestExample(() => 0)).toBe(REQUEST_EXAMPLES[0]);
    expect(pickRequestExample(() => 0.999999)).toBe(
      REQUEST_EXAMPLES[REQUEST_EXAMPLES.length - 1],
    );
  });
});
