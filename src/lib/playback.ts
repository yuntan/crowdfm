import { segmentAtElapsedTime, type ProgramSegment, type ProgramTimeline } from "@/lib/domain";

export function estimateServerNow(
  observedServerNow: number,
  observedClientNow: number,
  clientNow: number,
): number {
  return observedServerNow + Math.max(0, clientNow - observedClientNow);
}

export type PlaybackState =
  | { phase: "countdown"; remainingMs: number }
  | {
      phase: "live";
      elapsedMs: number;
      segmentOffsetMs: number;
      segment: ProgramSegment;
    }
  | { phase: "ended" };

export function derivePlaybackState(
  serverNow: number,
  startsAt: number,
  timeline: ProgramTimeline,
): PlaybackState {
  if (serverNow < startsAt) {
    return { phase: "countdown", remainingMs: startsAt - serverNow };
  }

  const elapsedMs = serverNow - startsAt;
  const segment = segmentAtElapsedTime(timeline, elapsedMs);
  if (!segment) {
    return { phase: "ended" };
  }

  return {
    phase: "live",
    elapsedMs,
    segmentOffsetMs: elapsedMs - segment.startsAtMs,
    segment,
  };
}
