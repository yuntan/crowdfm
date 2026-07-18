import { describe, expect, it } from "vitest";

import {
  analyzePcm16le,
  parseSunoBatch,
  rankCandidates,
  type AudioAnalysis,
} from "@/lib/suno-import";

function pcmWithAmplitudeSections(
  sections: Array<{ seconds: number; amplitude: number; period: number }>,
  sampleRate = 1_000,
): Buffer {
  const sampleCount = sections.reduce((total, section) => total + section.seconds * sampleRate, 0);
  const pcm = Buffer.alloc(sampleCount * 2);
  let offset = 0;

  for (const section of sections) {
    for (let sample = 0; sample < section.seconds * sampleRate; sample += 1) {
      const value = Math.round(
        Math.sin((sample / section.period) * Math.PI * 2) * section.amplitude * 32_767,
      );
      pcm.writeInt16LE(value, offset);
      offset += 2;
    }
  }

  return pcm;
}

describe("parseSunoBatch", () => {
  it("extracts batch provenance, themes, prompts, and candidate song IDs", () => {
    const markdown = `# Suno generation batch — 2026-07-17

- Model: v5.5
- Plan at generation: Pro Plan

## 1. Quiet Victory

- Theme: Quiet satisfaction after completing something difficult
- Instrumental: Yes
- Generated at: 2026-07-17T15:44:06+09:00 (batch record)
- Song URLs:
  - [Small Win Tonight — candidate A](https://suno.com/song/first-id)
  - [Small Win Tonight — candidate B](https://suno.com/song/second-id)
- Prompt:

> Warm downtempo instrumental.
> No vocals.
`;

    expect(parseSunoBatch(markdown)).toEqual({
      model: "v5.5",
      planAtGeneration: "Pro Plan",
      themes: [
        {
          index: 1,
          name: "Quiet Victory",
          description: "Quiet satisfaction after completing something difficult",
          instrumental: true,
          generatedAt: "2026-07-17T15:44:06+09:00",
          prompt: "Warm downtempo instrumental. No vocals.",
          candidates: [
            {
              id: "first-id",
              title: "Small Win Tonight",
              sourceUrl: "https://suno.com/song/first-id",
            },
            {
              id: "second-id",
              title: "Small Win Tonight",
              sourceUrl: "https://suno.com/song/second-id",
            },
          ],
        },
      ],
    });
  });
});

describe("analyzePcm16le", () => {
  it("detects an early structural lift and recommends an excerpt that includes it", () => {
    const pcm = pcmWithAmplitudeSections([
      { seconds: 20, amplitude: 0.08, period: 40 },
      { seconds: 30, amplitude: 0.55, period: 13 },
    ]);

    const result = analyzePcm16le(pcm, 1_000);

    expect(result.durationMs).toBe(50_000);
    expect(result.hookStartMs).toBeGreaterThanOrEqual(18_000);
    expect(result.hookStartMs).toBeLessThanOrEqual(21_000);
    expect(result.excerptEndMs).toBe(result.hookStartMs + 12_000);
    expect(result.hookConfidence).toBeGreaterThan(0.7);
    expect(result.leadingSilenceMs).toBe(0);
  });

  it("reports leading silence and clipping without producing invalid numbers", () => {
    const pcm = Buffer.concat([
      Buffer.alloc(2_000 * 2),
      pcmWithAmplitudeSections([{ seconds: 3, amplitude: 1, period: 4 }], 1_000),
    ]);

    const result = analyzePcm16le(pcm, 1_000);

    expect(result.leadingSilenceMs).toBe(2_000);
    expect(result.clippingRatio).toBeGreaterThan(0);
    expect(Number.isFinite(result.meanRmsDb)).toBe(true);
  });
});

describe("rankCandidates", () => {
  it("prefers a clean candidate with a confident early hook and breaks ties by ID", () => {
    const baseline: AudioAnalysis = {
      durationMs: 120_000,
      sampleRate: 8_000,
      meanRmsDb: -16,
      peakDb: -1,
      clippingRatio: 0,
      silenceRatio: 0,
      leadingSilenceMs: 0,
      hookStartMs: 32_000,
      excerptEndMs: 44_000,
      hookConfidence: 0.8,
      structuralLiftDb: 8,
    };

    const ranked = rankCandidates([
      { id: "candidate-b", analysis: { ...baseline, hookConfidence: 0.45 } },
      { id: "candidate-a", analysis: baseline },
      { id: "candidate-c", analysis: baseline },
    ]);

    expect(ranked.map((candidate) => candidate.id)).toEqual([
      "candidate-a",
      "candidate-c",
      "candidate-b",
    ]);
    expect(ranked[0].selectionScore).toBeGreaterThan(ranked[2].selectionScore);
  });
});
