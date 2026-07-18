import { cueAtElapsedTime, type ProgramCue, type ProgramTimeline } from "@/lib/domain";

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
      cueOffsetMs: number;
      cue: ProgramCue;
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
  const cue = cueAtElapsedTime(timeline, elapsedMs);
  if (!cue) return { phase: "ended" };

  return {
    phase: "live",
    elapsedMs,
    cueOffsetMs: elapsedMs - cue.startsAtMs,
    cue,
  };
}
