# CrowdFM MVP Specification

Status: Draft for review
Scope: OpenAI Build Week hackathon demo
Last updated: 2026-07-17

## Assumptions

1. CrowdFM is an English-language web application, not a native mobile app. The UI, generated host speech, and hackathon demo are all in English because judging is conducted in English.
2. The hackathon submission prioritizes the isolated demo mode described below. The eventual product remains one shared scheduled station.
3. The MVP runs and is verified only on the developer's local machine. Cloud deployment and public hosting are out of scope.
4. The local server runs as a long-lived Node.js process with SQLite and local generated-audio storage.
5. Only curated, locally stored songs generated with Suno under usage rights that permit the public hackathon demo are eligible for selection.
6. A submitted demo request is guaranteed to be selected. Normal broadcasts will not guarantee selection.
7. OpenAI Realtime API is out of scope because the show is produced before broadcast.
8. Music is generated and reviewed before the demo. Runtime Suno generation and Suno Platform API access are not required for the MVP.

## Objective

CrowdFM recreates a radio station with a consistent AI personality. Listeners send a radio name and one free-form message. That message may describe a mood, moment, or musical direction. The AI host selects a track from a small catalog of pre-generated Suno songs, responds to the message, and produces a short show as one locally assembled audio file.

The production concept is a single scheduled station that everyone hears live. The hackathon demo compresses that experience: one anonymous submission triggers production of one short, isolated demo show. Once the show is ready, it starts after a short countdown and cannot be paused, rewound, skipped, or scrubbed.

The primary audience for the hackathon demo is a judge who must understand the full causal path without prior setup:

1. Send a message.
2. See the show being produced.
3. Receive an in-page completion notification.
4. Hear the AI host read and respond to the message.
5. Hear the selected generated track begin.

## Product Principles

- **A radio station, not a playlist:** the listener does not control playback.
- **Live listening, pre-produced content:** generation happens before airtime; the listening experience follows a server-owned clock.
- **One recognizable host:** a calm, English-speaking, female-presenting radio personality with consistent pacing and tone.
- **Grounded talk:** the host may only use facts attached to the curated catalog entry.
- **Selection is normally scarce:** not every request is chosen outside demo mode.
- **AI disclosure:** the listening UI must clearly state that the personality and voice are AI-generated.

## MVP User Experience

### Request form

The local demo page requires no account. It accepts:

- `radioName`: 1–30 characters.
- `message`: 20–760 characters containing the listener's story and, optionally, a mood, moment, or musical direction. A named external song or artist may be treated as style context, but can never be played unless it corresponds to an eligible generated catalog entry. There is no separate theme field.

Example:

> I just finished a difficult release after a tense week. I want to enjoy the achievement quietly, so please choose a calm instrumental track.

### Production status

After submission, the same page displays these audience-facing stages:

1. `CHECKING_REQUEST` — Checking your message
2. `PLANNING_SHOW` — Selecting music and planning the show
3. `GENERATING_VOICE` — Recording the AI host
4. `ASSEMBLING_SHOW` — Mixing the finished show
5. `READY` — Your show is ready
6. `ON_AIR` — On Air
7. `ENDED` — Broadcast ended
8. `FAILED` — We couldn't produce this show

When the show becomes ready, the page changes visibly and plays one short notification sound. Browser push notifications and PWA installation are out of scope.

### Broadcast entry

The listener presses a single `Tune in` button before playback. This user gesture initializes the HTML audio element so browser autoplay rules do not silently block the broadcast.

When ready, demo mode sets `startsAt` to exactly 15 seconds after the program enters `READY` and displays the countdown. Playback then follows the server-authored timeline. Custom pause, seek, replay, and skip controls do not exist.

If a listener reloads or joins late, the client calculates the elapsed show time from the server clock and seeks the final program audio to that offset rather than restarting it.

## Short Demo Show

The demo show contains one request and one track:

1. Short opening.
2. Radio name and listener message.
3. Host response.
4. Track selection and reason.
5. A configured excerpt of the generated track, starting at the beginning and ending at or just after the first chorus begins.
6. Short closing.

For the submitted video, waiting time and music playback may be shortened in editing, but the underlying application must execute the real production flow.

## Technology Stack

- Next.js 16.2.x App Router.
- React and TypeScript with strict type checking.
- Next.js Route Handlers using the Node.js runtime.
- Zod for request, external-response, environment, and structured-output validation.
- SQLite for requests, programs, catalog metadata, and timeline records.
- Local filesystem storage for generated MP3 assets during the hackathon.
- Vitest for unit and integration tests.
- Playwright for the main browser flow.
- OpenAI JavaScript SDK.
- A locally installed FFmpeg executable for deterministic audio normalization, trimming, and concatenation.

The demo runs locally in one long-running Node process with a writable SQLite database and generated-audio directory. No cloud deployment is required.

## OpenAI Integration

### Request moderation

Before any listener text reaches the script prompt, the server submits it to the Moderation API using `omni-moderation-latest`. Flagged requests are rejected with a generic user-facing explanation and never enter show production.

The server also applies local rules:

- Normalize Unicode and whitespace.
- Enforce field lengths.
- Remove control characters.
- Treat listener text as quoted data, never as instructions.
- Do not interpolate listener text into a system/developer instruction.

### Show planning and script generation

Use the Responses API with:

- Model: `gpt-5.6` for the hackathon submission.
- Reasoning effort: `low` as the latency baseline; increase only after an eval shows a quality gain.
- Output: strict Structured Outputs parsed through Zod.
- Inputs: sanitized request, host persona, complete eligible catalog, and verified facts for each track.
- No web search and no model-supplied external facts.

The output contract is:

```ts
const ShowPlanSchema = z.object({
  selectedTrackId: z.string(),
  selectionReason: z.string().min(1).max(240),
  preTrackScript: z.string().min(1).max(1400),
  postTrackScript: z.string().min(1).max(500),
});
```

`selectedTrackId` must match an eligible catalog entry. The server rejects an unknown identifier even if the structured response is otherwise valid.

### Speech generation

Use `POST /audio/speech` through the OpenAI SDK with:

- Model: `gpt-4o-mini-tts`.
- Output: MP3 for broad browser support and compact storage.
- Voice: start by auditioning `marin`, `coral`, and `shimmer` in English; record the selected voice in configuration rather than scattering it through code.
- Instructions: speak in natural English as a calm, warm, knowledgeable radio host; avoid high energy, exaggerated reactions, and rushed pacing.

Generate `preTrackScript` and `postTrackScript` as separate intermediate audio assets. The server combines them with the selected music excerpt into one final program MP3 before entering `READY`.

The UI must display `AI-generated host and voice` near the player.

## Music Generation and Curated Track Catalog

The MVP catalog contains ten songs generated manually in the Suno web application before the demo. One candidate per editorial theme is recorded in `data/suno-tracks.json`; the MP3 masters remain local under ignored `assets/`. Music generation is an editorial preparation step, not part of a listener request, so a slow or unavailable Suno service cannot block the live demo and listener text is never sent to Suno.

The demo operator defines a small coverage matrix of moods and energy levels, generates multiple candidates for each gap, and manually selects the strongest outputs. Each candidate must be generated under a plan, terms, or written grant permitting its use in the public hackathon submission, then downloaded into local catalog storage. Do not assume that subscribing later changes the rights for a song generated on a free plan. Retain the prompt, song URL, generation timestamp, model when known, plan at generation, and a local rights record before marking a track eligible. Suno Platform API integration remains out of scope until the account is provisioned and its authenticated API contract and output rights are verified.

Every catalog entry contains:

```ts
const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  displayArtist: z.string(),
  audioPath: z.string(),
  durationMs: z.number().int().positive(),
  excerptStartMs: z.literal(0),
  excerptEndMs: z.number().int().positive(),
  tags: z.array(z.string()),
  mood: z.array(z.string()),
  hasVocals: z.boolean(),
  editorialNotes: z.array(z.string()),
  provenance: z.object({
    provider: z.literal("SUNO"),
    songId: z.string(),
    sourceUrl: z.string().url(),
    generatedAt: z.string().datetime(),
    generationPrompt: z.string(),
    model: z.string().optional(),
    planAtGeneration: z.string(),
    rightsEvidencePath: z.string(),
  }),
  verifiedFacts: z.array(z.object({
    text: z.string(),
    sourceUrl: z.string().url(),
  })),
});
```

For the hackathon demo, `excerptStartMs` is `0`. The importer proposes a per-track `excerptEndMs` at or just after the first hook begins, and catalog validation enforces `0 < excerptEndMs <= durationMs`. The selected values and reproducible measurements are stored in `data/suno-tracks.json` and `data/suno-analysis.json`.

The model cannot invent a track or choose outside this catalog. Before recording the demo, every song must be manually reviewed for audio quality, rights evidence, duration, excerpt boundary, and transition into the closing speech.

### Final program audio

After both speech assets exist, the local worker uses FFmpeg to:

1. Normalize the speech and music inputs to one agreed codec, sample rate, and channel layout.
2. Trim the selected song from `excerptStartMs = 0` through `excerptEndMs`.
3. Apply only short boundary fades needed to avoid clicks; do not remix or alter the song's creative content.
4. Concatenate opening speech, the music excerpt, and closing speech in that order.
5. Write one final MP3, probe its actual duration, and persist its checksum and cue boundaries.

Intermediate speech files and catalog masters remain server-only. Only the final program asset is exposed to the browser.

## Program Timeline Contract

The browser consumes a discriminated union. It never receives raw model prompts or internal reasoning.

```ts
type ProgramCue =
  | {
      type: "HOST";
      startsAtMs: number;
      durationMs: number;
      transcript: string;
    }
  | {
      type: "MUSIC";
      startsAtMs: number;
      durationMs: number;
      trackId: string;
      title: string;
      displayArtist: string;
    };

interface ProgramTimeline {
  programId: string;
  startsAt: string;
  durationMs: number;
  audioUrl: string;
  isAiVoice: true;
  cues: ProgramCue[];
}
```

`startsAtMs` is relative to the start of the final program audio. Cues must be ordered, non-overlapping, gap-free, and contained within `durationMs`. The music cue duration equals `excerptEndMs - excerptStartMs`. Cues drive the visible now-playing state; they do not switch media sources.

## Server State Model

Internal program states:

```text
QUEUED
  -> MODERATING
  -> PLANNING
  -> SYNTHESIZING_SPEECH
  -> ASSEMBLING_AUDIO
  -> READY
  -> ON_AIR
  -> ENDED

Any production state -> FAILED
MODERATING -> REJECTED
```

Only the worker may advance production states. State transitions are monotonic. Retrying a failed production creates an explicit attempt record rather than moving the same state backward.

## REST API Contract

Every error uses:

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### `POST /api/requests`

Creates the listener request and its demo program.

Request:

```json
{
  "radioName": "Sleepless Engineer",
  "message": "I just finished a difficult release after a tense week. I want to enjoy the achievement quietly, so please choose a calm instrumental track."
}
```

Success: `201 Created`

```json
{
  "requestId": "req_...",
  "programId": "prg_...",
  "status": "QUEUED"
}
```

Failures:

- `422 VALIDATION_ERROR`
- `422 REQUEST_REJECTED`
- `503 PRODUCTION_UNAVAILABLE`

### `GET /api/programs/:programId`

Returns the audience-safe state of one demo program. Dynamic route parameters are awaited according to the current Next.js App Router contract.

Production response:

```json
{
  "programId": "prg_...",
  "status": "PLANNING",
  "displayStage": "PLANNING_SHOW",
  "serverNow": "2026-07-16T12:00:00.000Z"
}
```

Ready response adds `timeline`.

The endpoint never returns prompts, moderation category scores, stack traces, provider response bodies, or API keys.

### `GET /api/audio/:assetId`

Streams the final program MP3. It supports byte-range requests and only serves asset IDs belonging to a ready or previously aired program. Intermediate speech and catalog source assets are not addressable through this route.

Failures:

- `404 AUDIO_NOT_FOUND`
- `416 INVALID_RANGE`

## Playback Algorithm

1. Poll `GET /api/programs/:id` while production is active.
2. Estimate server clock offset from the returned `serverNow`.
3. After the user presses `Tune in`, initialize the program's HTML audio element.
4. At or after `startsAt`, calculate `elapsedMs = estimatedServerNow - startsAt`.
5. Set the audio element's `currentTime` to `min(elapsedMs, durationMs) / 1000` and start playback.
6. Select the cue containing `elapsedMs` to update the transcript or now-playing display.
7. Listen for audio `playing`, `waiting`, `error`, and `ended` events.
8. If autoplay is blocked, show a blocking `Tap to return to the broadcast` action.
9. If the final asset cannot be loaded, show a station error; there is no alternate client-side media source to skip to.

Periodic drift correction across multiple listeners is not required for the hackathon demo. The timeline contract is designed so it can be added later.

## Project Structure

```text
app/
  api/                    Next.js Route Handlers
  programs/[id]/          production status and player page
  page.tsx                request form
components/
  request-form.tsx
  production-status.tsx
  live-player.tsx
lib/
  api/                    shared request/response schemas
  catalog/                generated-track metadata and validation
  db/                     SQLite access and migrations
  openai/                 moderation, planning, and speech adapters
  programs/               state machine, worker, audio assembly, and timeline builder
generated/                runtime audio files; never committed
data/
  catalog.json            curated tracks and sources
tests/
  unit/
  integration/
e2e/
docs/
```

## Commands

These commands become authoritative after scaffolding:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Code Style

- TypeScript strict mode; no implicit `any`.
- External data is parsed once at the boundary with Zod.
- Domain states use discriminated unions and exhaustive switches.
- IDs use prefixed branded types where practical.
- No provider SDK object escapes its adapter module.

```ts
export function assertNever(value: never): never {
  throw new Error(`Unhandled state: ${String(value)}`);
}

export function toDisplayStage(status: ProgramStatus): DisplayStage {
  switch (status) {
    case "QUEUED":
    case "MODERATING":
      return "CHECKING_REQUEST";
    case "PLANNING":
      return "PLANNING_SHOW";
    case "SYNTHESIZING_SPEECH":
      return "GENERATING_VOICE";
    case "ASSEMBLING_AUDIO":
      return "ASSEMBLING_SHOW";
    case "READY":
      return "READY";
    case "ON_AIR":
      return "ON_AIR";
    case "ENDED":
      return "ENDED";
    case "FAILED":
    case "REJECTED":
      return "FAILED";
    default:
      return assertNever(status);
  }
}
```

## Testing Strategy

### Unit tests

- Request, generated-track catalog, and rights-metadata validation.
- State-transition legality.
- Structured show-plan validation.
- Final-audio cue ordering, gaps, and duration calculations.
- Late-join audio offset and cue calculation.
- Display-stage mapping.

### Integration tests

- API contracts with OpenAI and audio-assembly adapters mocked.
- Moderation rejection does not start production.
- Unknown model-selected track IDs fail safely.
- Failed speech generation produces a stable `FAILED` response.
- Failed FFmpeg assembly never exposes a partial program.
- Audio range requests.

### End-to-end tests

- Submit an anonymous request.
- Observe production stages.
- Receive ready notification.
- Join the countdown.
- Hear one mocked program asset and observe its host → music → host cue changes.
- Confirm that playback controls are absent.
- Reload during playback and resume at the calculated broadcast position.

The real OpenAI speech integration, FFmpeg assembly, and final generated tracks are tested manually on the local demo machine before recording the submission video. Automated tests must not spend OpenAI or Suno credits.

## Boundaries

### Always

- Validate user input, catalog files, model output, and provider responses.
- Keep the OpenAI API key server-side.
- Disclose that the voice is AI-generated.
- Preserve Suno provenance and rights evidence for every eligible track.
- Log state transitions and provider request IDs without logging full listener messages.

### Ask first

- Add an external database, queue, object store, authentication provider, or email service.
- Change the public REST contract or timeline schema.
- Add runtime music generation or any unreviewed external music source.
- Deploy the MVP or add any cloud infrastructure.

### Never

- Commit secrets or generated listener data.
- Send the OpenAI API key to the browser.
- Read flagged content on air.
- Let model output select an unregistered track.
- Add unsourced artist claims to the script.
- Import a Suno output whose generation-time rights do not permit the public hackathon demo.
- Expose catalog master files or intermediate speech assets through the public audio route.
- Present the AI voice as a human speaker.

## Success Criteria

1. A demo operator can open the local URL and submit a request without authentication.
2. Invalid or moderated requests fail with a clear, stable error.
3. A valid request produces a schema-valid show plan using `gpt-5.6`.
4. The selected track always belongs to the rights-verified generated catalog.
5. Two speech assets are generated using `gpt-4o-mini-tts` and remain server-only.
6. FFmpeg produces one final MP3 with gap-free host → music → host cues.
7. The page shows production progress and an in-page/audio completion notification.
8. The listener enters through one user gesture and sees a 15-second scheduled countdown.
9. Playback provides no pause, seek, replay, or skip UI.
10. Reloading during the show resumes at the current broadcast position.
11. AI-voice disclosure and track licensing/source information are visible.
12. The end-to-end demo can be shown coherently in a video shorter than three minutes.

## Out of Scope

- Email request ingestion.
- Native mobile apps and push notifications.
- User accounts.
- Full 30-minute or multi-request shows.
- Runtime Suno generation or Suno Platform API integration.
- Arbitrary external music search.
- Real-time AI generation.
- Listener reaction processing.
- Human editorial review.
- Multi-client drift correction demonstration.
- Archive playback.
- Cloud deployment and public hosting.
- Public-environment abuse protection such as distributed rate limiting.

## Final Editorial Checklist

1. Audition the preview of every track used in a public recording and override any unsuitable automatic selection or boundary.
2. Use the `marin` English TTS voice selected for the submitted implementation.

## Documentation Sources

- OpenAI model guidance: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI text-to-speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI Moderation: https://developers.openai.com/api/docs/guides/moderation
- Suno Platform research and access constraints: `docs/research/suno-platform.md`
- Suno Terms of Service: https://about.suno.com/terms
- Suno paid-plan output rights: https://help.suno.com/en/articles/9601665
- Suno free-plan output rights: https://help.suno.com/en/articles/9601601
- FFmpeg documentation: https://ffmpeg.org/documentation.html
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
