"use client";

import { useState, type FormEvent } from "react";

export function RequestForm({ onSubmit, submitting }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitting: boolean }) {
  const [message, setMessage] = useState("");
  return <form className="request-form" onSubmit={onSubmit}>
    <label htmlFor="radioName">RADIO NAME</label><input id="radioName" name="radioName" maxLength={30} required placeholder="What should the host call you?" autoComplete="nickname" />
    <label htmlFor="message">YOUR MESSAGE</label><textarea id="message" name="message" minLength={20} maxLength={760} required rows={7} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell the host your story, mood, moment, or music direction. Artist and song names are used only as style context." />
    <div className="form-meta"><span>Include a moment, mood, or music direction.</span><output>{message.length} / 760</output></div>
    <button className="primary-button" disabled={submitting} type="submit">{submitting ? "Opening the studio…" : "Create my show"}<span aria-hidden="true">↗</span></button>
    <p className="disclosure">Your message is processed by AI to create this local demo show. No account is needed.</p>
  </form>;
}
