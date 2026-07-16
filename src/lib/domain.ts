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
    youtubeVideoId: z.string().min(6),
    title: z.string().min(1),
    artist: z.string().min(1),
    durationMs: z.number().int().positive(),
    startSeconds: z.number().min(0).default(0),
    endSeconds: z.number().positive(),
    tags: z.array(z.string()),
    mood: z.array(z.string()),
    hasVocals: z.boolean(),
    licenseUrl: z.string().url(),
    sourceUrl: z.string().url(),
  })
  .superRefine((track, context) => {
    if (track.startSeconds >= track.endSeconds) {
      context.addIssue({
        code: "custom",
        path: ["endSeconds"],
        message: "endSeconds must be after startSeconds",
      });
    }
    if (track.endSeconds > track.durationMs / 1_000) {
      context.addIssue({
        code: "custom",
        path: ["endSeconds"],
        message: "endSeconds must be within the source duration",
      });
    }
  });

export type Track = z.infer<typeof TrackSchema>;

const SegmentBaseSchema = z.object({
  startsAtMs: z.number().int().min(0),
  durationMs: z.number().int().positive(),
});

export const SpeechSegmentSchema = SegmentBaseSchema.extend({
  type: z.literal("SPEECH"),
  assetId: z.string().min(1),
  audioUrl: z.string().min(1),
  transcript: z.string().min(1),
});

export const YoutubeSegmentSchema = SegmentBaseSchema.extend({
  type: z.literal("YOUTUBE"),
  videoId: z.string().min(6),
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  title: z.string().min(1),
  artist: z.string().min(1),
  sourceUrl: z.string().url(),
  licenseUrl: z.string().url(),
});

export const ProgramSegmentSchema = z.discriminatedUnion("type", [
  SpeechSegmentSchema,
  YoutubeSegmentSchema,
]);

export const ProgramTimelineSchema = z
  .object({
    durationMs: z.number().int().positive(),
    segments: z.array(ProgramSegmentSchema).min(1),
  })
  .superRefine((timeline, context) => {
    let expectedStart = 0;
    for (const [index, segment] of timeline.segments.entries()) {
      if (segment.startsAtMs !== expectedStart) {
        context.addIssue({
          code: "custom",
          path: ["segments", index, "startsAtMs"],
          message: "segments must be ordered and gap-free",
        });
      }
      expectedStart = segment.startsAtMs + segment.durationMs;
    }
    if (timeline.durationMs !== expectedStart) {
      context.addIssue({
        code: "custom",
        path: ["durationMs"],
        message: "durationMs must end at the final segment boundary",
      });
    }
  });

export type ProgramTimeline = z.infer<typeof ProgramTimelineSchema>;
export type ProgramSegment = z.infer<typeof ProgramSegmentSchema>;

interface SpeechAsset {
  assetId: string;
  audioUrl: string;
  transcript: string;
  durationMs: number;
}

export function createProgramTimeline(input: {
  intro: SpeechAsset;
  track: Track;
  outro: SpeechAsset;
}): ProgramTimeline {
  const track = TrackSchema.parse(input.track);
  const trackDurationMs = Math.round((track.endSeconds - track.startSeconds) * 1_000);
  const trackStartsAtMs = input.intro.durationMs;
  const outroStartsAtMs = trackStartsAtMs + trackDurationMs;

  return ProgramTimelineSchema.parse({
    durationMs: outroStartsAtMs + input.outro.durationMs,
    segments: [
      {
        type: "SPEECH",
        startsAtMs: 0,
        durationMs: input.intro.durationMs,
        assetId: input.intro.assetId,
        audioUrl: input.intro.audioUrl,
        transcript: input.intro.transcript,
      },
      {
        type: "YOUTUBE",
        startsAtMs: trackStartsAtMs,
        durationMs: trackDurationMs,
        videoId: track.youtubeVideoId,
        startSeconds: track.startSeconds,
        endSeconds: track.endSeconds,
        title: track.title,
        artist: track.artist,
        sourceUrl: track.sourceUrl,
        licenseUrl: track.licenseUrl,
      },
      {
        type: "SPEECH",
        startsAtMs: outroStartsAtMs,
        durationMs: input.outro.durationMs,
        assetId: input.outro.assetId,
        audioUrl: input.outro.audioUrl,
        transcript: input.outro.transcript,
      },
    ],
  });
}

export function scheduledStartAfterReady(readyAt: number): number {
  return readyAt + READY_LEAD_TIME_MS;
}

export function segmentAtElapsedTime(
  timeline: ProgramTimeline,
  elapsedMs: number,
): ProgramSegment | null {
  if (elapsedMs < 0 || elapsedMs >= timeline.durationMs) {
    return null;
  }
  return (
    timeline.segments.find(
      (segment) => elapsedMs >= segment.startsAtMs && elapsedMs < segment.startsAtMs + segment.durationMs,
    ) ?? null
  );
}

export const ProgramStatusSchema = z.enum([
  "QUEUED",
  "MODERATING",
  "PLANNING",
  "SYNTHESIZING_PRE_TRACK",
  "SYNTHESIZING_POST_TRACK",
  "READY",
  "LIVE",
  "ENDED",
  "FAILED",
]);

export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;

export type DisplayStage =
  | "Request received"
  | "Checking your request"
  | "Building your show"
  | "Giving the host a voice"
  | "Your show is ready"
  | "On air"
  | "Broadcast ended"
  | "Production stopped";

export function toDisplayStage(status: ProgramStatus): DisplayStage {
  switch (status) {
    case "QUEUED":
      return "Request received";
    case "MODERATING":
      return "Checking your request";
    case "PLANNING":
      return "Building your show";
    case "SYNTHESIZING_PRE_TRACK":
    case "SYNTHESIZING_POST_TRACK":
      return "Giving the host a voice";
    case "READY":
      return "Your show is ready";
    case "LIVE":
      return "On air";
    case "ENDED":
      return "Broadcast ended";
    case "FAILED":
      return "Production stopped";
  }
}
