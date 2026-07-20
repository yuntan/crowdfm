# CrowdFM — Devpost submission copy

## Submission status

- Submitted to OpenAI Build Week on July 20, 2026 at 20:48 JST.
- Devpost project: https://devpost.com/software/crowdfm
- Public demo video: https://youtu.be/wtK3uNK7rLk
- Source repository: https://github.com/yuntan/crowdfm

## Elevator pitch (200/200 characters)

CrowdFM turns listener messages into one shared live radio show, using GPT-5.6 to select licensed music, write grounded host scripts, and schedule an AI-voiced broadcast that no one can pause or skip.

## Project description

### Inspiration

Music services have made listening infinitely convenient, but they have also made it solitary. Everyone gets a different recommendation queue and controls every second of it. What I missed was radio: a host with a point of view, a show shaped by messages from listeners, and the feeling that a moment is happening now rather than waiting in a playlist.

CrowdFM asks what an AI-native radio station could feel like. It starts small for Build Week: one listener story becomes one complete show, produced locally and scheduled fifteen seconds after it is ready.

### What it does

A listener submits a radio name and a short message about what is happening in their life. CrowdFM moderates the request, asks GPT-5.6 to choose from a curated catalog of original songs, and writes a warm host response grounded only in that message and verified catalog metadata.

The host introduction and closing are recorded with OpenAI text-to-speech. CrowdFM then uses FFmpeg to assemble the two speech clips and the beginning-to-first-hook excerpt of the selected song into one continuous MP3. When production reaches READY, the server assigns an airtime exactly fifteen seconds later.

The listener presses Tune in once to satisfy browser audio rules. From there, the server clock owns the experience. There are no pause, seek, skip, or replay controls. Reloading or arriving late resumes at the current broadcast offset instead of restarting the show. The UI follows the same timeline to move from AI host to now playing to sign-off.

### How I built it

CrowdFM is a local-only Next.js application with TypeScript, React, Node route handlers, SQLite state, Zod validation, the OpenAI JavaScript SDK, and FFmpeg.

GPT-5.6 receives the sanitized listener message, a host persona, and the complete eligible catalog. Strict Structured Outputs return an intro script, outro script, and a catalog track ID. The server rejects any ID not present in the validated catalog, so the model cannot invent a song or filesystem path. `gpt-4o-mini-tts` records the host with a consistent voice. OpenAI moderation runs before either step.

The music catalog was prepared separately in Suno under a Pro plan. I generated two candidates for each of ten editorial themes, preserved prompts and source URLs, downloaded the masters locally, and built a deterministic analysis/import tool that measures each file, ranks each pair, and proposes a first-hook boundary. The source MP3s remain local and are not committed; the repository contains metadata and generation-time rights records.

The final audio is represented by a gap-free HOST → MUSIC → HOST cue timeline. Program transitions are guarded in SQLite, and the client derives countdown, live offset, current cue, and ended state from server time.

### How I used Codex

Codex was my continuous engineering partner during Build Week. I used it to challenge the core product idea, turn the decisions into a detailed specification, design the production state machine and timeline contract, implement each vertical slice, and add failure-focused tests before refactoring. It also helped build the Suno batch analysis pipeline, revise the architecture from multiple browser media sources to one assembled audio file, and verify the complete browser journey.

The repository's dated commit history shows that progression. I kept the product and rights decisions human-owned: the radio metaphor, local-only boundary, scheduling behavior, catalog themes and prompts, licensing policy, and editorial acceptance remain my responsibility.

### Challenges

The hardest problem was preserving the meaning of “live” in a locally produced demo. Browser autoplay restrictions require a gesture, generated speech has variable duration, and a listener may reload midway through the program. Treating the final show as one immutable audio file with a server-authored timeline solved those constraints without exposing playback controls.

Another challenge was allowing creative selection without allowing hallucinated media. The solution was to make GPT-5.6 return only a schema-validated catalog ID and resolve every usable fact on the server.

### Accomplishments

- A coherent message-to-broadcast flow that can be run locally without accounts.
- A fixed airtime and late-join behavior instead of a disguised playlist player.
- A rights-recorded original catalog with deterministic analysis and repeatable metadata generation.
- Stable failure handling that does not leak prompts, API keys, provider responses, or source masters.
- Unit, integration, and Playwright coverage that uses mock providers and never spends API credits.

### What I learned

AI is most useful here when it is constrained by a strong editorial and technical frame. The model provides interpretation and personality; the application owns eligibility, facts, timing, state, media access, and failure behavior. I also learned that audio architecture is product architecture: assembling one program file made the experience more convincingly radio-like while simplifying synchronization.

### What's next

The next step is to expand CrowdFM from an isolated demo into one genuinely shared station: accept many messages, let an AI producer shape a scheduled rundown, add human editorial review, synchronize multiple listeners, and build transparent catalog and disclosure tools without giving up the no-skip radio experience.

## Built with

Next.js, React, TypeScript, Node.js, SQLite, Zod, OpenAI API, GPT-5.6, OpenAI Moderation, gpt-4o-mini-tts, FFmpeg, Suno, Vitest, Playwright

## Judge testing instructions

Run locally on macOS with Node.js 24+, pnpm 11, and FFmpeg. Execute `pnpm install && pnpm dev`, open `http://localhost:3000`, submit the prefilled request, and press Tune in when READY. Default mock mode needs no keys or licensed audio and reproduces the complete scheduled host → music → host broadcast. See README for the optional real-provider setup.

## YouTube metadata

Title: `CrowdFM — AI-Native Live Radio | OpenAI Build Week`

Description:

> CrowdFM turns a listener message into a short radio show with a consistent AI host, an original song selected for that story, and a fixed airtime. Once the broadcast begins, there is no pause, skip, replay, or scrub control.
>
> Built for OpenAI Build Week with Codex, GPT-5.6 Structured Outputs, OpenAI Moderation, gpt-4o-mini-tts, Next.js, SQLite, Zod, and FFmpeg.
>
> Source and local setup: https://github.com/yuntan/crowdfm
>
> Music in this demo: “Small Win Tonight” — CrowdFM Original. Generated with Suno v5.5 under a Pro plan on July 17, 2026. Source: https://suno.com/song/58e0cf9b-c386-486b-9690-73032461604e
>
> The host and narration are AI-generated voices. Music provenance and generation-time rights evidence are documented in the repository.

## Required custom answers

- Submitter Type: Individual
- Country of Residence: Japan
- Category: Apps for Your Life
- Repository URL: https://github.com/yuntan/crowdfm
- Test URL/instructions: use the judge testing instructions above
- Codex `/feedback` Session ID: `019f6538-80d6-7d40-8c62-69e31df4bffb`
- Plugin/developer tool instructions: Not applicable — CrowdFM is a listener-facing web application.
