"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ProgramConsole, type ProgramPayload } from "@/components/program-console";
import { RequestForm } from "@/components/request-form";
import { derivePlaybackState, estimateServerNow, type PlaybackState } from "@/lib/playback";

interface ServerClock { serverNow: number; clientNow: number; }

function queryProgramId(): string | null {
  const value = new URLSearchParams(window.location.search).get("program");
  return value && /^[a-zA-Z0-9-]{1,80}$/.test(value) ? value : null;
}

export function CrowdFmApp() {
  const [programId, setProgramId] = useState<string | null>(null);
  const [program, setProgram] = useState<ProgramPayload | null>(null);
  const [clock, setClock] = useState<ServerClock | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioElement = useRef<HTMLAudioElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const previousStatus = useRef<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const restoredId = queryProgramId();
      if (restoredId) {
        setProgramId(restoredId);
        setArmed(sessionStorage.getItem(`crowdfm:tuned:${restoredId}`) === "true");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

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
        if (next.status !== "FAILED" && next.status !== "ENDED") timeout = setTimeout(poll, next.status === "READY" || next.status === "ON_AIR" ? 1_000 : 450);
      } catch (pollError) {
        if (!cancelled) setError(pollError instanceof Error ? pollError.message : "Connection lost.");
      }
    }
    void poll();
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); };
  }, [programId]);

  useEffect(() => {
    if (!program || previousStatus.current === program.status) return;
    if (program.status === "READY" && audioContext.current) {
      const context = audioContext.current;
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
    previousStatus.current = program.status;
  }, [program]);

  useEffect(() => {
    if (!program?.startsAt || !program.timeline) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [program?.startsAt, program?.timeline]);

  const playback = useMemo<PlaybackState | null>(() => {
    if (!program?.startsAt || !program.timeline || !clock) return null;
    return derivePlaybackState(estimateServerNow(clock.serverNow, clock.clientNow, now), program.startsAt, program.timeline);
  }, [clock, now, program]);

  useEffect(() => {
    const audio = audioElement.current;
    if (!audio || !armed || !program?.timeline || !playback) return;
    if (audio.getAttribute("src") !== program.timeline.audioUrl) {
      audio.src = program.timeline.audioUrl;
      audio.load();
    }
    if (playback.phase !== "live") { audio.pause(); return; }
    const expectedSeconds = playback.elapsedMs / 1_000;
    if (audio.paused || Math.abs(audio.currentTime - expectedSeconds) > 1.5) audio.currentTime = expectedSeconds;
    if (audio.paused) void audio.play().then(() => setPlaybackError(null)).catch(() => {
      setArmed(false);
      setPlaybackError("Tap Tune in to return to the live broadcast.");
    });
  }, [armed, playback, program]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    if (!audioContext.current && "AudioContext" in window) audioContext.current = new AudioContext();
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/programs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ radioName: form.get("radioName"), message: form.get("message") }) });
      const body = (await response.json()) as { programId?: string; message?: string };
      if (!response.ok || !body.programId) throw new Error(body.message ?? "Could not start the show.");
      window.history.replaceState(null, "", `?program=${encodeURIComponent(body.programId)}`);
      setProgramId(body.programId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not start the show.");
    } finally { setSubmitting(false); }
  }

  async function tuneIn() {
    const audio = audioElement.current;
    if (!audio || !program?.timeline) return;
    setPlaybackError(null);
    try {
      await audioContext.current?.resume();
      audio.src = program.timeline.audioUrl;
      audio.load();
      if (playback?.phase === "live") {
        audio.currentTime = playback.elapsedMs / 1_000;
        await audio.play();
      } else {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }
      sessionStorage.setItem(`crowdfm:tuned:${program.id}`, "true");
      setArmed(true);
    } catch {
      audio.muted = false;
      setPlaybackError("The receiver could not start. Tap Tune in to try again.");
    }
  }

  function startOver() {
    audioElement.current?.pause();
    window.history.replaceState(null, "", window.location.pathname);
    setProgramId(null); setProgram(null); setClock(null); setArmed(false); setError(null); setPlaybackError(null); previousStatus.current = null;
  }

  return (
    <main className="station-shell">
      <header className="station-header"><a className="wordmark" href="#top" aria-label="CrowdFM home">Crowd<span>FM</span></a><div className="live-mark"><i /> LOCAL SIGNAL · 101.5</div></header>
      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow">ONE STORY. ONE FREQUENCY. YOUR MOMENT.</p><h1>Radio made<br /><em>for you.</em></h1><p className="lede">Share what is happening in your life. Our AI host shapes it into a personal radio show, then airs it fifteen seconds after production.</p></div>
        <div className="studio-card">
          <div className="studio-topline"><span>STUDIO REQUEST LINE</span><span className="signal-bars" aria-hidden="true"><b /><b /><b /><b /></span></div>
          {!programId ? <RequestForm onSubmit={submit} submitting={submitting} /> : program ? <ProgramConsole program={program} playback={playback} armed={armed} playbackError={playbackError} onTuneIn={tuneIn} onStartOver={startOver} /> : <div className="loading-console" role="status"><span className="spinner" /> Opening the studio line…</div>}
          <audio className="program-audio" ref={audioElement} preload="auto" aria-label="CrowdFM live broadcast" />
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </section>
      <section className="how-it-works" aria-labelledby="how-title"><p className="section-label">THE FORMAT</p><h2 id="how-title">From message to broadcast.</h2><ol><li><strong>01</strong><span>Tell us what matters</span><p>A move, a win, a hard night, or a song-shaped memory.</p></li><li><strong>02</strong><span>We produce your show</span><p>The host writes a response and mixes it with an original track.</p></li><li><strong>03</strong><span>Tune in together</span><p>At airtime, the show moves forward like a real live broadcast.</p></li></ol></section>
      <footer><span>CrowdFM / OpenAI Build Week</span><span>AI-generated host and voice · Rights-recorded generated music catalog</span></footer>
    </main>
  );
}
