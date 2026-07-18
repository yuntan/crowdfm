import { describe, expect, it, vi } from "vitest";

import type { Track } from "@/lib/domain";
import { OpenAIProductionProvider, type ProviderClient } from "@/lib/openai-provider";

const track: Track = {
  id: "licensed-one",
  title: "Licensed One",
  displayArtist: "CrowdFM Original",
  audioPath: "assets/licensed-one.mp3",
  durationMs: 180_000,
  excerptStartMs: 0,
  excerptEndMs: 41_000,
  tags: ["hopeful"],
  mood: ["warm"],
  hasVocals: true,
  editorialNotes: ["Warm and hopeful"],
  provenance: {
    provider: "SUNO",
    songId: "licensed-one",
    sourceUrl: "https://suno.com/song/licensed-one",
    generatedAt: "2026-07-17T15:44:06+09:00",
    generationPrompt: "Warm and hopeful.",
    planAtGeneration: "Pro Plan",
    rightsEvidencePath: "data/suno-generation-2026-07-17.md",
  },
  verifiedFacts: [],
};

function fakeClient(): ProviderClient {
  return {
    moderations: {
      create: vi.fn().mockResolvedValue({ results: [{ flagged: false, categories: {} }] }),
    },
    responses: {
      parse: vi.fn().mockResolvedValue({
        output_parsed: {
          introScript: "Maya, this next chapter deserves its own frequency.",
          outroScript: "Keep moving forward, Maya.",
          trackId: "licensed-one",
        },
      }),
    },
    audio: {
      speech: {
        create: vi.fn().mockResolvedValue({
          arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
        }),
      },
    },
  };
}

describe("OpenAIProductionProvider", () => {
  it("moderates the complete listener request with omni-moderation-latest", async () => {
    const client = fakeClient();
    const provider = new OpenAIProductionProvider({ client, catalog: [track] });

    await expect(
      provider.moderate({ radioName: "Maya", message: "A long enough listener story for radio." }),
    ).resolves.toEqual({ flagged: false });
    expect(client.moderations.create).toHaveBeenCalledWith({
      model: "omni-moderation-latest",
      input: "Radio name: Maya\nMessage: A long enough listener story for radio.",
    });
  });

  it("uses gpt-5.6 structured output and resolves only catalog track IDs", async () => {
    const client = fakeClient();
    const provider = new OpenAIProductionProvider({ client, catalog: [track] });

    await expect(
      provider.plan({ radioName: "Maya", message: "A long enough listener story for radio." }),
    ).resolves.toMatchObject({ track });
    expect(client.responses.parse).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.6" }));
  });

  it("rejects a model-selected track ID outside the catalog", async () => {
    const client = fakeClient();
    vi.mocked(client.responses.parse).mockResolvedValueOnce({
      output_parsed: { introScript: "Hello there.", outroScript: "Good night.", trackId: "invented" },
    });
    const provider = new OpenAIProductionProvider({ client, catalog: [track] });

    await expect(
      provider.plan({ radioName: "Maya", message: "A long enough listener story for radio." }),
    ).rejects.toThrow("outside the curated catalog");
  });

  it("generates marin MP3 speech and returns its measured duration", async () => {
    const client = fakeClient();
    const writeAsset = vi.fn().mockResolvedValue(undefined);
    const provider = new OpenAIProductionProvider({
      client,
      catalog: [track],
      measureDuration: vi.fn().mockResolvedValue(1_234),
      writeAsset,
      createId: () => "speech-1",
    });

    await expect(provider.synthesize("Welcome to CrowdFM.", "intro")).resolves.toEqual({
      assetId: "speech-1",
      filePath: "generated/audio/speech-1.mp3",
      durationMs: 1_234,
    });
    expect(client.audio.speech.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: "Welcome to CrowdFM.",
      instructions: expect.stringContaining("radio host"),
      response_format: "mp3",
    });
    expect(writeAsset).toHaveBeenCalledWith("speech-1", expect.any(Uint8Array));
  });
});
