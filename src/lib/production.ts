import { z } from "zod";

import {
  TrackSchema,
  createProgramTimeline,
  scheduledStartAfterReady,
  type ListenerRequest,
  type ProgramStatus,
  type Track,
} from "@/lib/domain";
import type { ProgramStore } from "@/lib/program-store";

const ModerationResultSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().optional(),
});

const ShowPlanSchema = z.object({
  introScript: z.string().trim().min(1).max(2_000),
  outroScript: z.string().trim().min(1).max(1_000),
  track: TrackSchema,
});

const SpeechAssetSchema = z.object({
  assetId: z.string().min(1),
  audioUrl: z.string().min(1),
  durationMs: z.number().int().positive(),
});

export type ShowPlan = {
  introScript: string;
  outroScript: string;
  track: Track;
};

export interface ProductionProvider {
  moderate(request: ListenerRequest): Promise<{ flagged: boolean; reason?: string }>;
  plan(request: ListenerRequest): Promise<ShowPlan>;
  synthesize(
    script: string,
    slot: "intro" | "outro",
  ): Promise<{ assetId: string; audioUrl: string; durationMs: number }>;
}

interface ProductionDependencies {
  store: ProgramStore;
  provider: ProductionProvider;
  now?: () => number;
}

export async function produceProgram(
  programId: string,
  { store, provider, now = Date.now }: ProductionDependencies,
): Promise<void> {
  let status: ProgramStatus = "QUEUED";
  const request = store.get(programId)?.request;
  if (!request || !store.transition(programId, "QUEUED", "MODERATING")) {
    return;
  }
  status = "MODERATING";

  try {
    const moderation = ModerationResultSchema.parse(await provider.moderate(request));
    if (moderation.flagged) {
      store.transition(programId, status, "FAILED", {
        errorCode: "REQUEST_REJECTED",
        errorMessage: "This request cannot be turned into a show. Please revise it and try again.",
      });
      return;
    }

    if (!store.transition(programId, status, "PLANNING")) return;
    status = "PLANNING";
    const plan = ShowPlanSchema.parse(await provider.plan(request));

    if (!store.transition(programId, status, "SYNTHESIZING_PRE_TRACK")) return;
    status = "SYNTHESIZING_PRE_TRACK";
    const intro = SpeechAssetSchema.parse(await provider.synthesize(plan.introScript, "intro"));

    if (!store.transition(programId, status, "SYNTHESIZING_POST_TRACK")) return;
    status = "SYNTHESIZING_POST_TRACK";
    const outro = SpeechAssetSchema.parse(await provider.synthesize(plan.outroScript, "outro"));

    const timeline = createProgramTimeline({
      intro: { ...intro, transcript: plan.introScript },
      track: plan.track,
      outro: { ...outro, transcript: plan.outroScript },
    });
    const readyAt = now();
    store.transition(programId, status, "READY", {
      readyAt,
      startsAt: scheduledStartAfterReady(readyAt),
      timeline,
    });
  } catch {
    store.transition(programId, status, "FAILED", {
      errorCode: "PRODUCTION_UNAVAILABLE",
      errorMessage: "The show could not be produced. Please try again.",
    });
  }
}
