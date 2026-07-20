"use client";

import { useEffect, useState, type FormEvent } from "react";

export const REQUEST_EXAMPLES = [
  "I just finished a difficult project after a stressful week. I want to enjoy this small victory quietly, so please choose a warm, calm instrumental track for the moment.",
  "I moved to a new city today and everything still feels unfamiliar. Please give me something hopeful and gently energetic for my first night here.",
  "It is raining outside, and I am finally taking a quiet evening for myself after a busy month. I would love something soft, reflective, and comforting.",
  "I have been training for my first long-distance race, and today I completed my hardest run yet. Please choose something uplifting that feels like steady forward motion.",
  "An old friend and I met again after years apart, and it felt as if no time had passed. I want a warm, nostalgic song for the journey home.",
  "I have felt creatively stuck lately, but tonight a new idea finally arrived. Please play something dreamy and spacious that helps me stay in that feeling.",
] as const;

export function pickRequestExample(random: () => number = Math.random): string {
  const index = Math.min(
    REQUEST_EXAMPLES.length - 1,
    Math.max(0, Math.floor(random() * REQUEST_EXAMPLES.length)),
  );
  return REQUEST_EXAMPLES[index] as string;
}

export function RequestForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
}) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMessage(pickRequestExample()));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <form className="request-form" onSubmit={onSubmit}>
      <label htmlFor="radioName">RADIO NAME</label>
      <input
        id="radioName"
        name="radioName"
        maxLength={30}
        required
        placeholder="What should the host call you?"
        autoComplete="nickname"
      />
      <label htmlFor="message">YOUR MESSAGE</label>
      <textarea
        id="message"
        name="message"
        minLength={20}
        maxLength={760}
        required
        rows={7}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Tell the host your story, mood, moment, or music direction. Artist and song names are used only as style context."
      />
      <div className="form-meta">
        <span>Include a moment, mood, or music direction.</span>
        <output>{message.length} / 760</output>
      </div>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "Opening the studio…" : "Create my show"}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="disclosure">
        Your message is processed by AI to create this local demo show. No account is needed.
      </p>
    </form>
  );
}
