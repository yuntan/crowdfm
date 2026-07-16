import type { ListenerRequest, Track } from "@/lib/domain";
import type { ProductionProvider, ShowPlan } from "@/lib/production";

const previewTrack: Track = {
  id: "local-preview",
  youtubeVideoId: "mock-preview",
  title: "Track selection pending",
  artist: "Local preview signal",
  durationMs: 60_000,
  startSeconds: 0,
  endSeconds: 12,
  tags: ["preview", "uplifting"],
  mood: ["warm", "hopeful"],
  hasVocals: false,
  licenseUrl: "https://example.com/crowdfm-license-pending",
  sourceUrl: "https://example.com/crowdfm-track-pending",
};

function delay(): Promise<void> {
  const configured = Number(process.env.CROWDFM_MOCK_DELAY_MS ?? 450);
  return new Promise((resolve) => setTimeout(resolve, Number.isFinite(configured) ? configured : 450));
}

export class MockProductionProvider implements ProductionProvider {
  async moderate(): Promise<{ flagged: boolean }> {
    await delay();
    return { flagged: false };
  }

  async plan(request: ListenerRequest): Promise<ShowPlan> {
    await delay();
    return {
      introScript: `${request.radioName}, welcome to CrowdFM. You shared: ${request.message} Tonight, this frequency belongs to your next chapter. Here is a warm local preview while the final licensed track list is being selected.`,
      outroScript: `${request.radioName}, keep that feeling with you. This was CrowdFM, made from your story.`,
      track: previewTrack,
    };
  }

  async synthesize(_script: string, slot: "intro" | "outro") {
    await delay();
    return {
      assetId: `mock-${slot}`,
      audioUrl: `/api/audio/mock-${slot}`,
      durationMs: slot === "intro" ? 9_000 : 5_000,
    };
  }
}

declare global {
  var crowdFmMockProvider: MockProductionProvider | undefined;
}

export function getProductionProvider(): ProductionProvider {
  globalThis.crowdFmMockProvider ??= new MockProductionProvider();
  return globalThis.crowdFmMockProvider;
}
