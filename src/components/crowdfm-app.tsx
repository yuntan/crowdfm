"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { ProgramStatus, ProgramTimeline } from "@/lib/domain";
import { derivePlaybackState, estimateServerNow, type PlaybackState } from "@/lib/playback";

interface ProgramPayload {
  id: string;
  request: { radioName: string; message: string };
  status: ProgramStatus;
  readyAt: number | null;
  startsAt: number | null;
  timeline: ProgramTimeline | null;
  errorCode: string | null;
  errorMessage: string | null;
  serverNow: number;
}

interface ServerClock {
  serverNow: number;
  clientNow: number;
}

const productionStages = [
  "Request received",
  "Safety check",
  "Writing the show",
  "Giving the host a voice",
] as const;

function productionStageIndex(status: ProgramStatus): number {
  if (status === "QUEUED") return 0;
  if (status === "MODERATING") return 1;
  if (status === "PLANNING") return 2;
  return 3;
}

function formatClock(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `00:${String(seconds).padStart(2, "0")}`;
}

export function CrowdFmApp() {
  const [programId, setProgramId] = useState<string | null>(null);
  const [program, setProgram] = useState<ProgramPayload | null>(null);
  const [clock, setClock] = useState<ServerClock | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const previousStatus = useRef<ProgramStatus | null>(null);

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/programs/${programId}`, { cache: "no-store" });
        const body = (await response.json()) as ProgramPayload | { message?: string };
        if (!response.ok) throw new Error("message" in body ? body.message : "Program not found.");
        if (cancelled) return;
        const next = body as ProgramPayload;
        setProgram(next);
        setClock({ serverNow: next.serverNow, clientNow: Date.now() });
        if (next.status !== "FAILED" && next.status !== "ENDED") {
          timeout = setTimeout(poll, next.status === "READY" || next.status === "LIVE" ? 1_000 : 450);
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError instanceof Error ? pollError.message : "Connection lost.");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [programId]);

  useEffect(() => {
    if (!program || previousStatus.current === program.status) return;
    if (program.status === "READY") {
      const context = audioContext.current;
      if (context) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 740;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.36);
      }
    }
    previousStatus.current = program.status;
  }, [program]);

  useEffect(() => {
    if (!program?.startsAt || !program.timeline) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [program?.startsAt, program?.timeline]);

  const playback = useMemo<PlaybackState | null>(() => {
    if (!program?.startsAt || !program.timeline || !clock) return null;
    return derivePlaybackState(
      estimateServerNow(clock.serverNow, clock.clientNow, now),
      program.startsAt,
      program.timeline,
    );
  }, [clock, now, program]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    if (!audioContext.current && "AudioContext" in window) {
      audioContext.current = new AudioContext();
    }

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          radioName: form.get("radioName"),
          message: form.get("message"),
        }),
      });
      const body = (await response.json()) as { programId?: string; message?: string };
      if (!response.ok || !body.programId) throw new Error(body.message ?? "Could not start the show.");
      setProgramId(body.programId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not start the show.");
    } finally {
      setSubmitting(false);
    }
  }

  async function tuneIn() {
    await audioContext.current?.resume();
    setArmed(true);
  }

  function startOver() {
    window.speechSynthesis?.cancel();
    setProgramId(null);
    setProgram(null);
    setClock(null);
    setArmed(false);
    setError(null);
    previousStatus.current = null;
  }

  return (
    <main className="station-shell">
      <header className="station-header">
        <a className="wordmark" href="#top" aria-label="CrowdFM home">
          Crowd<span>FM</span>
        </a>
        <div className="live-mark"><i /> LOCAL SIGNAL · 101.5</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">ONE STORY. ONE FREQUENCY. YOUR MOMENT.</p>
          <h1>Radio made<br /><em>for you.</em></h1>
          <p className="lede">Share what is happening in your life. Our AI host shapes it into a personal radio show, then airs it fifteen seconds after production.</p>
        </div>

        <div className="studio-card">
          <div className="studio-topline">
            <span>STUDIO REQUEST LINE</span>
            <span className="signal-bars" aria-hidden="true"><b /><b /><b /><b /></span>
          </div>

          {!programId ? (
            <RequestForm onSubmit={submit} submitting={submitting} />
          ) : program ? (
            <ProgramConsole program={program} playback={playback} armed={armed} onTuneIn={tuneIn} onStartOver={startOver} />
          ) : (
            <div className="loading-console" role="status"><span className="spinner" /> Opening the studio line…</div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <p className="section-label">THE FORMAT</p>
        <h2 id="how-title">From message to broadcast.</h2>
        <ol>
          <li><strong>01</strong><span>Tell us what matters</span><p>A move, a win, a hard night, or a song-shaped memory.</p></li>
          <li><strong>02</strong><span>We produce your show</span><p>The host writes a response and builds a timed radio rundown.</p></li>
          <li><strong>03</strong><span>Tune in together</span><p>At airtime, the show moves forward like a real live broadcast.</p></li>
        </ol>
      </section>

      <footer>
        <span>CrowdFM / OpenAI Build Week</span>
        <span>AI-generated host and voice · Music catalog pending final licensing review</span>
      </footer>
    </main>
  );
}

function RequestForm({ onSubmit, submitting }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitting: boolean }) {
  const [message, setMessage] = useState("");
  return (
    <form className="request-form" onSubmit={onSubmit}>
      <label htmlFor="radioName">RADIO NAME</label>
      <input id="radioName" name="radioName" maxLength={30} required placeholder="What should the host call you?" autoComplete="nickname" />
      <label htmlFor="message">YOUR MESSAGE</label>
      <textarea id="message" name="message" minLength={20} maxLength={760} required rows={7} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell the host what is happening — and the mood, artist, or kind of song you need right now." />
      <div className="form-meta"><span>Include a moment, mood, or music direction.</span><output>{message.length} / 760</output></div>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "Opening the studio…" : "Create my show"}<span aria-hidden="true">↗</span>
      </button>
      <p className="disclosure">By sending, you agree that your message will be processed by AI to create this local demo show.</p>
    </form>
  );
}

function ProgramConsole({ program, playback, armed, onTuneIn, onStartOver }: { program: ProgramPayload; playback: PlaybackState | null; armed: boolean; onTuneIn: () => void; onStartOver: () => void }) {
  if (program.status === "FAILED") {
    return <div className="failure-panel" role="alert"><p>PRODUCTION STOPPED</p><h2>We lost the signal.</h2><span>{program.errorMessage}</span><button className="secondary-button" onClick={onStartOver}>Try another message</button></div>;
  }

  if (!program.timeline || !playback) {
    const active = productionStageIndex(program.status);
    return <div className="production-panel" aria-live="polite"><div className="record-orbit"><span /><b>REC</b></div><p className="kicker">PRODUCING FOR {program.request.radioName.toUpperCase()}</p><h2>{productionStages[active]}</h2><ol>{productionStages.map((stage, index) => <li className={index <= active ? "active" : ""} key={stage}><i>{index < active ? "✓" : index + 1}</i><span>{stage}</span></li>)}</ol><p className="production-note">The local producer is building one continuous broadcast.</p></div>;
  }

  const live = playback.phase === "live";
  const segment = live ? playback.segment : null;
  return <div className="broadcast-panel" aria-live="polite">
    <div className="broadcast-status"><span className={live ? "on-air" : ""}>{playback.phase === "countdown" ? "SHOW READY" : playback.phase === "ended" ? "SIGNING OFF" : "ON AIR"}</span><span>{program.request.radioName}</span></div>
    {playback.phase === "countdown" && <div className="countdown"><p>BROADCAST BEGINS IN</p><strong>{formatClock(playback.remainingMs)}</strong><div className="countdown-track"><i style={{ width: `${Math.max(0, Math.min(100, (1 - playback.remainingMs / 15_000) * 100))}%` }} /></div></div>}
    {playback.phase === "live" && <NowPlaying playback={playback} armed={armed} />}
    {playback.phase === "ended" && <div className="signoff"><p>TRANSMISSION COMPLETE</p><h2>Thanks for tuning in.</h2><span>Your story had the frequency for one show.</span></div>}
    {!armed && playback.phase !== "ended" && <button className="primary-button tune-button" onClick={onTuneIn}>{playback.phase === "countdown" ? "Tune in" : "Join live broadcast"}<span aria-hidden="true">▶</span></button>}
    {armed && playback.phase === "countdown" && <p className="armed-note"><i /> Receiver armed. Keep this tab open.</p>}
    {armed && live && segment && <p className="no-controls">Live broadcast · pause, seek, replay, and skip are unavailable</p>}
    {playback.phase === "ended" && <button className="secondary-button" onClick={onStartOver}>Create another show</button>}
  </div>;
}

function NowPlaying({ playback, armed }: { playback: Extract<PlaybackState, { phase: "live" }>; armed: boolean }) {
  const { segment, segmentOffsetMs } = playback;
  useSpeechSegment(segment, segmentOffsetMs, armed);
  if (segment.type === "YOUTUBE") {
    return <div className="now-playing"><YoutubeExcerpt segment={segment} offsetMs={segmentOffsetMs} active={armed} /><div><p>NOW PLAYING</p><h2>{segment.title}</h2><span>{segment.artist}</span><div className="source-links"><a href={segment.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a><a href={segment.licenseUrl} target="_blank" rel="noreferrer">License ↗</a></div></div></div>;
  }
  return <div className="host-speaking"><div className="host-avatar" aria-hidden="true"><span>CF</span><i /><i /><i /></div><div><p>AI HOST · LIVE</p><h2>“{segment.transcript}”</h2><span>AI-generated host and voice</span></div></div>;
}

function useSpeechSegment(segment: Extract<PlaybackState, { phase: "live" }>["segment"], offsetMs: number, armed: boolean) {
  const key = segment.type === "SPEECH" ? segment.assetId : `youtube:${segment.videoId}`;
  useEffect(() => {
    if (!armed || segment.type !== "SPEECH") return;
    if (segment.assetId.startsWith("mock-") && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(segment.transcript);
      utterance.lang = "en-US";
      utterance.rate = 0.96;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return () => window.speechSynthesis.cancel();
    }
    const audio = new Audio(segment.audioUrl);
    const play = () => { audio.currentTime = offsetMs / 1_000; void audio.play(); };
    audio.addEventListener("loadedmetadata", play, { once: true });
    return () => { audio.pause(); audio.removeEventListener("loadedmetadata", play); };
  // The segment key intentionally starts playback once per server-authored segment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, key]);
}

type YoutubeSegment = Extract<ProgramTimeline["segments"][number], { type: "YOUTUBE" }>;

function YoutubeExcerpt({ segment, offsetMs, active }: { segment: YoutubeSegment; offsetMs: number; active: boolean }) {
  const target = useRef<HTMLDivElement>(null);
  const player = useRef<{ loadVideoById(options: { videoId: string; startSeconds: number; endSeconds: number }): void; stopVideo(): void; destroy(): void } | null>(null);

  useEffect(() => {
    if (segment.videoId.startsWith("mock-")) return;
    const browser = window as typeof window & { YT?: { Player: new (target: HTMLElement, options: object) => typeof player.current }; onYouTubeIframeAPIReady?: () => void };
    let cancelled = false;
    const mount = () => {
      if (cancelled || !target.current || !browser.YT || player.current) return;
      player.current = new browser.YT.Player(target.current, { playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0 }, events: { onReady: () => { if (active) player.current?.loadVideoById({ videoId: segment.videoId, startSeconds: segment.startSeconds + offsetMs / 1_000, endSeconds: segment.endSeconds }); } } });
    };
    if (browser.YT?.Player) mount();
    else {
      const previous = browser.onYouTubeIframeAPIReady;
      browser.onYouTubeIframeAPIReady = () => { previous?.(); mount(); };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }
    return () => { cancelled = true; player.current?.destroy(); player.current = null; };
  // Player is mounted once for this catalog entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.videoId]);

  useEffect(() => {
    if (segment.videoId.startsWith("mock-")) return;
    if (active) player.current?.loadVideoById({ videoId: segment.videoId, startSeconds: segment.startSeconds + offsetMs / 1_000, endSeconds: segment.endSeconds });
    else player.current?.stopVideo();
  // Active changes represent explicit receiver arming, not a seek control.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (segment.videoId.startsWith("mock-")) return <div className={`preview-visual ${active ? "playing" : ""}`} aria-label="Local music preview"><div className="preview-disc"><span>CF</span></div><div className="equalizer" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div><p>LOCAL PREVIEW<br /><small>Final track to be selected</small></p></div>;
  return <div className="youtube-frame" ref={target} aria-label={`${segment.title} by ${segment.artist}`} />;
}
