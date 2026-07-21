# CrowdFM

![CrowdFM — one story, one frequency](docs/crowdfm-devpost-thumbnail.png)

CrowdFM turns a listener message into a short radio show. The same AI host responds to the story, introduces an original song chosen to match it, and signs off. Each show has a fixed airtime. Once it begins, no one can pause, skip, replay, or scrub it.

Built for **OpenAI Build Week**, the MVP runs entirely on one local machine. It does not require a cloud deployment.

## Run the real AI demo

Requirements:

- Node.js 24 or newer
- pnpm 11
- FFmpeg on `PATH`
- An OpenAI API key
- `crowdfm-judge-audio-pack.zip` from the Devpost submission

```bash
pnpm install
unzip /path/to/crowdfm-judge-audio-pack.zip
cp .env.example .env.local
pnpm dev
```

Before `pnpm dev`, edit `.env.local`:

```dotenv
CROWDFM_PROVIDER=openai
OPENAI_API_KEY=<your OpenAI API key>
CROWDFM_CATALOG_PATH=data/suno-tracks.json
```

Extract the pack at the repository root. Its ten MP3s should appear as `assets/<Suno song ID>.mp3`. Open [http://localhost:3000](http://localhost:3000), submit the prefilled radio name and message, and watch GPT-5.6 select a track and write the show. Then press **Tune in** and wait for the scheduled airtime, 15 seconds after production finishes.

The pack contains only the ten excerpts used by the app, each trimmed from the start of a song to its first hook. It excludes rejected tracks and unused parts of the masters. The pack is not committed to Git or covered by the repository's MIT License.

## API-key-free fallback

Mock mode replaces moderation, planning, and speech generation, but it still plays music from the audio pack. Leave `CROWDFM_PROVIDER=mock` in `.env.local` to use the first catalog track and a fixed script. macOS uses `say` for the mock host voice; other platforms use generated tones.

## Real AI production flow

The demo video and judge instructions use the real provider. The repository holds the catalog metadata and rights records. The Devpost attachment supplies the exact audio excerpts without placing them in the MIT-licensed source tree.

Real production uses:

- `omni-moderation-latest` to screen the listener message.
- `gpt-5.6` with strict Structured Outputs to select an eligible catalog ID and write the introduction and closing.
- `gpt-4o-mini-tts` with the `marin` voice to record both host segments.
- FFmpeg to normalize, trim, fade, and concatenate speech → music → speech into one MP3.
- A server-owned timeline to schedule airtime, start late listeners at the live offset, and update the visible cue state.

The model cannot invent a song or file path: the server accepts only IDs from the Zod-validated local catalog. API keys, prompts, provider responses, source masters, and intermediate speech files never reach the browser.

## How Codex was used

I used Codex throughout Build Week to turn the idea into a tested product. It challenged the playlist-versus-radio concept, helped write the product specification, designed the guarded production state machine and single-audio timeline, and helped implement the Next.js UI and Node routes. It also helped integrate GPT-5.6 and speech generation, build a deterministic Suno import and ranking tool, and test behavior with Vitest and Playwright. The dated commits and documents under `docs/` show this work.

I made the product and rights decisions: the radio format, local-only scope, 15-second READY window, single audio file, catalog themes, Suno prompts, generation plan, licensing boundary, and final editorial approval.

## Project structure

- `src/app/`: Next.js page and local API routes.
- `src/components/`: request, production, countdown, and broadcast UI.
- `src/lib/`: schemas, SQLite store, OpenAI/mock providers, production state machine, playback, and audio assembly.
- `e2e/`: browser-level request-to-broadcast journey.
- `data/`: generated-track catalog metadata, analysis, and rights record; no master audio.
- `docs/`: specification, ADRs, implementation plan, and submission material.
- `assets/`, `generated/`, `.crowdfm/`: ignored local inputs and runtime state.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

Automated tests always use mock providers. They never call OpenAI, spend credits, or depend on external media.

## Known boundaries

This hackathon demo runs on one local machine; it is not yet a shared internet station. It has no accounts, distributed queue, external database, public hosting, or multi-client drift correction. Editors generate songs in Suno before running the app. CrowdFM never sends listener text to Suno.

Code is available under the [MIT License](LICENSE). Generated music is excluded from that license and from this repository; its provenance is recorded in `data/suno-generation-2026-07-17.md`.

See [the product specification](docs/crowdfm-spec.md) and [architecture decisions](docs/decisions/) for the full contract.
