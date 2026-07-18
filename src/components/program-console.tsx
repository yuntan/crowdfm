"use client";

import { DISPLAY_STAGE_COPY, type DisplayStage, type ProgramStatus, type ProgramTimeline } from "@/lib/domain";
import type { PlaybackState } from "@/lib/playback";

export interface ProgramPayload { id: string; request: { radioName: string; message: string }; status: ProgramStatus; displayStage: DisplayStage; readyAt: number | null; startsAt: number | null; timeline: ProgramTimeline | null; errorCode: string | null; errorMessage: string | null; serverNow: number; }

const productionStages: DisplayStage[] = ["CHECKING_REQUEST", "PLANNING_SHOW", "GENERATING_VOICE", "ASSEMBLING_SHOW"];

function formatClock(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `00:${String(seconds).padStart(2, "0")}`;
}

export function ProgramConsole({ program, playback, armed, playbackError, onTuneIn, onStartOver }: { program: ProgramPayload; playback: PlaybackState | null; armed: boolean; playbackError: string | null; onTuneIn: () => Promise<void>; onStartOver: () => void }) {
  if (program.status === "FAILED") return <div className="failure-panel" role="alert"><p>{DISPLAY_STAGE_COPY.FAILED.toUpperCase()}</p><h2>We lost the signal.</h2><span>{program.errorMessage}</span><button className="secondary-button" onClick={onStartOver}>Try another message</button></div>;
  if (!program.timeline || !playback) {
    const active = Math.max(0, productionStages.indexOf(program.displayStage));
    return <div className="production-panel" aria-live="polite"><div className="record-orbit"><span /><b>REC</b></div><p className="kicker">PRODUCING FOR {program.request.radioName.toUpperCase()}</p><h2>{DISPLAY_STAGE_COPY[productionStages[active] as DisplayStage]}</h2><ol>{productionStages.map((stage, index) => <li className={index <= active ? "active" : ""} key={stage}><i>{index < active ? "✓" : index + 1}</i><span>{DISPLAY_STAGE_COPY[stage]}</span></li>)}</ol><p className="production-note">The local producer is building one continuous broadcast.</p></div>;
  }
  const live = playback.phase === "live";
  return <div className="broadcast-panel" aria-live="polite">
    <div className="broadcast-status"><span className={live ? "on-air" : ""}>{playback.phase === "countdown" ? DISPLAY_STAGE_COPY.READY.toUpperCase() : playback.phase === "ended" ? DISPLAY_STAGE_COPY.ENDED.toUpperCase() : DISPLAY_STAGE_COPY.ON_AIR.toUpperCase()}</span><span>{program.request.radioName}</span></div>
    {playback.phase === "countdown" && <div className="countdown"><p>BROADCAST BEGINS IN</p><strong>{formatClock(playback.remainingMs)}</strong><div className="countdown-track"><i style={{ width: `${Math.max(0, Math.min(100, (1 - playback.remainingMs / 15_000) * 100))}%` }} /></div></div>}
    {playback.phase === "live" && <NowPlaying playback={playback} />}
    {playback.phase === "ended" && <div className="signoff"><p>TRANSMISSION COMPLETE</p><h2>Thanks for tuning in.</h2><span>Your story had the frequency for one show.</span></div>}
    {!armed && playback.phase !== "ended" && <button className="primary-button tune-button" onClick={() => void onTuneIn()}>{playback.phase === "countdown" ? "Tune in" : "Join live broadcast"}<span aria-hidden="true">▶</span></button>}
    {armed && playback.phase === "countdown" && <p className="armed-note"><i /> Receiver armed. The show will start automatically.</p>}
    {armed && live && <p className="no-controls">Live broadcast · pause, seek, replay, and skip are unavailable</p>}
    {playbackError && <p className="receiver-error" role="alert">{playbackError}</p>}
    {playback.phase === "ended" && <button className="secondary-button" onClick={onStartOver}>Create another show</button>}
  </div>;
}

function NowPlaying({ playback }: { playback: Extract<PlaybackState, { phase: "live" }> }) {
  const cue = playback.cue;
  if (cue.type === "MUSIC") return <div className="now-playing"><div className="preview-visual playing" aria-label="Original music is playing"><div className="preview-disc"><span>CF</span></div><div className="equalizer" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div><p>CROWDFM ORIGINAL</p></div><div><p>NOW PLAYING</p><h2>{cue.title}</h2><span>{cue.displayArtist}</span></div></div>;
  return <div className="host-speaking"><div className="host-avatar" aria-hidden="true"><span>CF</span><i /><i /><i /></div><div><p>AI HOST · LIVE</p><h2>“{cue.transcript}”</h2><span>AI-generated host and voice</span></div></div>;
}
