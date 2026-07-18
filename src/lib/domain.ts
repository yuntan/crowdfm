import { z } from "zod";

export const READY_LEAD_TIME_MS = 15_000;

export const RequestSchema = z.object({
  radioName: z.string().trim().min(1).max(30),
  message: z.string().trim().min(20).max(760),
});

export type ListenerRequest = z.infer<typeof RequestSchema>;

export const TrackSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    displayArtist: z.string().min(1),
    audioPath: z.string().regex(/^assets\/[a-zA-Z0-9-]+\.mp3$/),
    durationMs: z.number().int().positive(),
    excerptStartMs: z.literal(0),
    excerptEndMs: z.number().int().positive(),
    tags: z.array(z.string().min(1)),
    mood: z.array(z.string().min(1)).min(1),
    hasVocals: z.boolean(),
    editorialNotes: z.array(z.string().min(1)),
    provenance: z.object({
      provider: z.literal("SUNO"),
      songId: z.string().min(1),
      sourceUrl: z.string().url(),
      generatedAt: z.string().datetime({ offset: true }),
      generationPrompt: z.string().min(1),
      model: z.string().min(1).optional(),
      planAtGeneration: z.string().min(1),
      rightsEvidencePath: z.string().regex(/^data\/[a-zA-Z0-9._/-]+\.md$/),
    }),
    verifiedFacts: z.array(
      z.object({ text: z.string().min(1), sourceUrl: z.string().url() }),
    ),
  })
  .superRefine((track, context) => {
    if (track.excerptEndMs > track.durationMs) {
      context.addIssue({
        code: "custom",
        path: ["excerptEndMs"],
        message: "excerptEndMs must be within the source duration",
      });
    }
  });

export type Track = z.infer<typeof TrackSchema>;

const CueBaseSchema = z.object({
  startsAtMs: z.number().int().min(0),
  durationMs: z.number().int().positive(),
});

export const HostCueSchema = CueBaseSchema.extend({
  type: z.literal("HOST"),
  transcript: z.string().min(1),
});

export const MusicCueSchema = CueBaseSchema.extend({
  type: z.literal("MUSIC"),
  trackId: z.string().min(1),
  title: z.string().min(1),
  displayArtist: z.string().min(1),
});

export const ProgramCueSchema = z.discriminatedUnion("type", [HostCueSchema, MusicCueSchema]);

export const ProgramTimelineSchema = z
  .object({
    audioUrl: z.string().regex(/^\/api\/audio\/[a-zA-Z0-9-]+$/),
    durationMs: z.number().int().positive(),
    isAiVoice: z.literal(true),
    cues: z.array(ProgramCueSchema).length(3),
  })
  .superRefine((timeline, context) => {
    let expectedStart = 0;
    for (const [index, cue] of timeline.cues.entries()) {
      if (cue.startsAtMs !== expectedStart) {
        context.addIssue({
          code: "custom",
          path: ["cues", index, "startsAtMs"],
          message: "cues must be ordered and gap-free",
        });
      }
      expectedStart = cue.startsAtMs + cue.durationMs;
    }
    if (timeline.durationMs !== expectedStart) {
      context.addIssue({
        code: "custom",
        path: ["durationMs"],
        message: "durationMs must end at the final cue boundary",
      });
    }
    if (timeline.cues[0]?.type !== "HOST" || timeline.cues[1]?.type !== "MUSIC" || timeline.cues[2]?.type !== "HOST") {
      context.addIssue({ code: "custom", path: ["cues"], message: "program cues must be HOST → MUSIC → HOST" });
    }
  });

export type ProgramTimeline = z.infer<typeof ProgramTimelineSchema>;
export type ProgramCue = z.infer<typeof ProgramCueSchema>;

interface SpeechCueInput {
  transcript: string;
  durationMs: number;
}

export function createProgramTimeline(input: {
  finalAudio: { audioUrl: string; durationMs: number };
  intro: SpeechCueInput;
  track: Track;
  outro: SpeechCueInput;
}): ProgramTimeline {
  const track = TrackSchema.parse(input.track);
  const musicDurationMs = track.excerptEndMs - track.excerptStartMs;
  const musicStartsAtMs = input.intro.durationMs;
  const outroStartsAtMs = musicStartsAtMs + musicDurationMs;
  const measuredOutroDurationMs = input.finalAudio.durationMs - outroStartsAtMs;
  const expectedDurationMs = outroStartsAtMs + input.outro.durationMs;

  if (measuredOutroDurationMs <= 0 || Math.abs(expectedDurationMs - input.finalAudio.durationMs) > 1_000) {
    throw new Error("Final audio duration does not match its source assets");
  }

  return ProgramTimelineSchema.parse({
    audioUrl: input.finalAudio.audioUrl,
    durationMs: input.finalAudio.durationMs,
    isAiVoice: true,
    cues: [
      {
        type: "HOST",
        startsAtMs: 0,
        durationMs: input.intro.durationMs,
        transcript: input.intro.transcript,
      },
      {
        type: "MUSIC",
        startsAtMs: musicStartsAtMs,
        durationMs: musicDurationMs,
        trackId: track.id,
        title: track.title,
        displayArtist: track.displayArtist,
      },
      {
        type: "HOST",
        startsAtMs: outroStartsAtMs,
        durationMs: measuredOutroDurationMs,
        transcript: input.outro.transcript,
      },
    ],
  });
}

export function scheduledStartAfterReady(readyAt: number): number {
  return readyAt + READY_LEAD_TIME_MS;
}

export function cueAtElapsedTime(timeline: ProgramTimeline, elapsedMs: number): ProgramCue | null {
  if (elapsedMs < 0 || elapsedMs >= timeline.durationMs) return null;
  return (
    timeline.cues.find(
      (cue) => elapsedMs >= cue.startsAtMs && elapsedMs < cue.startsAtMs + cue.durationMs,
    ) ?? null
  );
}

export const ProgramStatusSchema = z.enum([
  "QUEUED",
  "MODERATING",
  "PLANNING",
  "SYNTHESIZING_SPEECH",
  "ASSEMBLING_AUDIO",
  "READY",
  "ON_AIR",
  "ENDED",
  "FAILED",
]);

export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;

export const DisplayStageSchema = z.enum([
  "CHECKING_REQUEST",
  "PLANNING_SHOW",
  "GENERATING_VOICE",
  "ASSEMBLING_SHOW",
  "READY",
  "ON_AIR",
  "ENDED",
  "FAILED",
]);

export type DisplayStage = z.infer<typeof DisplayStageSchema>;

export const DISPLAY_STAGE_COPY: Record<DisplayStage, string> = {
  CHECKING_REQUEST: "Checking your message",
  PLANNING_SHOW: "Selecting music and planning the show",
  GENERATING_VOICE: "Recording the AI host",
  ASSEMBLING_SHOW: "Mixing the finished show",
  READY: "Your show is ready",
  ON_AIR: "On Air",
  ENDED: "Broadcast ended",
  FAILED: "We couldn't produce this show",
};

export function toDisplayStage(status: ProgramStatus): DisplayStage {
  switch (status) {
    case "QUEUED":
    case "MODERATING":
      return "CHECKING_REQUEST";
    case "PLANNING":
      return "PLANNING_SHOW";
    case "SYNTHESIZING_SPEECH":
      return "GENERATING_VOICE";
    case "ASSEMBLING_AUDIO":
      return "ASSEMBLING_SHOW";
    case "READY":
      return "READY";
    case "ON_AIR":
      return "ON_AIR";
    case "ENDED":
      return "ENDED";
    case "FAILED":
      return "FAILED";
  }
}
