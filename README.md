# CrowdFM

CrowdFM turns one listener message into a short, scheduled radio show: AI host speech, a curated YouTube excerpt, and a closing. The hackathon MVP is intentionally local-only; it does not deploy cloud infrastructure.

## Run the local demo

Requirements: Node.js 24 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The default `mock` provider needs no API key. Submit a radio name and a 20–760 character message, wait for production, then press **Tune in**. Airtime is exactly 15 seconds after the program becomes `READY`.

The mock provider deliberately uses a local visual/audio preview because the final licensed tracks and per-track first-chorus boundaries have not been selected yet.

## Enable the real OpenAI provider

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` and `CROWDFM_PROVIDER=openai`.
3. Replace the empty array in `data/tracks.json` with at least one manually verified track described in [data/README.md](data/README.md).
4. Run `pnpm dev` again.

Real mode uses:

- `omni-moderation-latest` for request moderation.
- `gpt-5.6` with Structured Outputs for the scripts and catalog track ID.
- `gpt-4o-mini-tts` with the `marin` voice for MP3 speech.
- `music-metadata` to measure generated MP3 duration before authoring the server timeline.
- The YouTube IFrame Player API with `startSeconds: 0` and the catalog's `endSeconds`.

Model output is never allowed to invent a video ID. It returns a `trackId`, which is resolved against the validated local catalog. Generated speech is stored under `generated/audio/`; program state is stored in `.crowdfm/crowdfm.sqlite`. Both are ignored by Git.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

`pnpm test:e2e` creates a production build, starts it locally, and exercises the request-to-tune-in flow in installed Chrome. Automated tests always use the mock provider and do not spend OpenAI credits or depend on YouTube availability.

## Current limits

- The final 5–10 licensed tracks and their `endSeconds` values are intentionally pending.
- The local MVP has no accounts, distributed queue, external database, public hosting, or cloud deployment.
- AI-generated host/voice disclosure and track source/license links are always visible in the broadcast UI.

Detailed behavior and boundaries are in [docs/crowdfm-spec.md](docs/crowdfm-spec.md), with implementation slices in [docs/crowdfm-implementation-plan.md](docs/crowdfm-implementation-plan.md).
