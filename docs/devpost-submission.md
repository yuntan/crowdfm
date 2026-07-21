# CrowdFM — Devpost submission copy

## Submission status

- Submitted to OpenAI Build Week on July 20, 2026 at 20:48 JST.
- Devpost project: https://devpost.com/software/crowdfm
- Public demo video: https://youtu.be/wtK3uNK7rLk
- Source repository: https://github.com/yuntan/crowdfm
- Judge audio pack: `crowdfm-judge-audio-pack.zip` (attached to Devpost, not Git)

## Elevator pitch (200/200 characters)

CrowdFM turns listener messages into one shared live radio show, using GPT-5.6 to select licensed music, write grounded host scripts, and schedule an AI-voiced broadcast that no one can pause or skip.

## Project description

### Inspiration

Music services have made listening easy, but often solitary. Each person gets a different recommendation queue and controls every second. I missed radio: a host with a point of view, a show shaped by listener messages, and a shared moment that does not wait in a playlist.

CrowdFM explores how an AI-native radio station could work. For Build Week, it starts small: the app turns one listener story into a complete show, produces it locally, and schedules it fifteen seconds after it is ready.

### What it does

A listener submits a radio name and a short message about their life. CrowdFM moderates the request. GPT-5.6 then chooses from a curated catalog of original songs and writes a warm host response based only on the message and verified catalog metadata.

OpenAI text-to-speech records the host's introduction and closing. CrowdFM uses FFmpeg to join those clips with an excerpt that runs from the start of the selected song to its first hook. The result is one continuous MP3. When production reaches READY, the server sets the airtime exactly fifteen seconds later.

The listener presses Tune in once to meet browser audio rules. The server clock then controls playback. The app has no pause, seek, skip, or replay controls. A late listener, or one who reloads, joins at the current broadcast offset instead of restarting the show. The same timeline moves the UI from AI host to now playing to sign-off.

### How I built it

CrowdFM is a local Next.js app built with TypeScript, React, Node route handlers, SQLite, Zod, the OpenAI JavaScript SDK, and FFmpeg.

GPT-5.6 receives the sanitized listener message, a host persona, and the full eligible catalog. Strict Structured Outputs make it return an introduction, a closing, and a catalog track ID. The server rejects any ID outside the validated catalog, so the model cannot invent a song or file path. `gpt-4o-mini-tts` records both host segments in the same voice. OpenAI moderation runs first.

I prepared the music catalog in Suno under a Pro plan. For each of ten editorial themes, I generated two candidates and saved their prompts and source URLs. I then downloaded the masters and built a deterministic import tool that measures each file, ranks each pair, and proposes where the first hook ends. The source MP3s stay local and out of Git; the repository contains only metadata and rights records from the time of generation.

A gap-free HOST → MUSIC → HOST cue timeline describes the final audio. SQLite guards program transitions. The client derives the countdown, live offset, current cue, and ended state from server time.

### How I used Codex

I used Codex throughout Build Week. It challenged the product idea, helped turn my decisions into a detailed specification, designed the production state machine and timeline contract, and helped implement each vertical slice. It also helped write failure tests, build the Suno batch analysis tool, replace several browser media sources with one assembled audio file, and verify the full browser journey.

The repository's dated commits show this work. I made the product and rights decisions: the radio format, local-only boundary, scheduling behavior, catalog themes and prompts, licensing policy, and final editorial choices.

### Challenges

The hardest problem was making a local demo feel live. Browsers require a gesture before playing audio, generated speech varies in length, and listeners may reload during a show. One fixed audio file and a server-authored timeline handle all three cases without exposing playback controls.

The second challenge was letting the model choose creatively without inventing media. GPT-5.6 returns only a schema-validated catalog ID, and the server resolves every fact the app uses.

### Accomplishments

- A complete message-to-broadcast flow that runs locally without accounts.
- A fixed airtime and late-join behavior instead of a disguised playlist player.
- A catalog of original songs with rights records, deterministic analysis, and repeatable metadata generation.
- Failure handling that does not leak prompts, API keys, provider responses, or source masters.
- Unit, integration, and Playwright coverage that uses mock providers and never spends API credits.

### What I learned

AI works best here under clear editorial rules and technical limits. The model provides interpretation and personality. The app controls eligibility, facts, timing, state, media access, and failures. I also learned that the audio design shapes the product: one program file feels more like radio and is easier to keep in sync.

### What's next

Next, I want to turn CrowdFM from a local demo into a shared station. It should accept many messages, let an AI producer plan a schedule, add human editorial review, keep many listeners in sync, and explain how it selects and creates music—all without giving up the no-skip radio experience.

## Built with

Next.js, React, TypeScript, Node.js, SQLite, Zod, OpenAI API, GPT-5.6, OpenAI Moderation, gpt-4o-mini-tts, FFmpeg, Suno, Vitest, Playwright

## Judge testing instructions

Run locally with Node.js 24+, pnpm 11, FFmpeg, and an OpenAI API key. Download the attached `crowdfm-judge-audio-pack.zip`, extract it at the repository root so the ten excerpts appear under `assets/`, copy `.env.example` to `.env.local`, and set `CROWDFM_PROVIDER=openai`, `OPENAI_API_KEY`, and `CROWDFM_CATALOG_PATH=data/suno-tracks.json`. Execute `pnpm install && pnpm dev`, open `http://localhost:3000`, submit the prefilled request, and press Tune in when READY. The attachment contains the exact rights-verified beginning-to-first-hook excerpts used by the runtime; music is not committed to Git or covered by the MIT License.

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
