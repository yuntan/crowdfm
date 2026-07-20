import { describe, expect, it } from "vitest";

import {
  RADIO_NAME_PREFIXES,
  RADIO_NAME_SUFFIXES,
  REQUEST_EXAMPLES,
  generateRadioName,
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

describe("generated radio names", () => {
  it("keeps every generated combination within the radio-name contract", () => {
    for (const prefix of RADIO_NAME_PREFIXES) {
      for (const suffix of RADIO_NAME_SUFFIXES) {
        expect(() =>
          RequestSchema.parse({
            radioName: `${prefix} ${suffix}`,
            message: REQUEST_EXAMPLES[0],
          }),
        ).not.toThrow();
      }
    }
  });

  it("uses two random values to generate a two-part name", () => {
    const values = [0, 0.999999];
    expect(generateRadioName(() => values.shift() ?? 0)).toBe(
      `${RADIO_NAME_PREFIXES[0]} ${RADIO_NAME_SUFFIXES[RADIO_NAME_SUFFIXES.length - 1]}`,
    );
  });
});
