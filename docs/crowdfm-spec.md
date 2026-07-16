# CrowdFM MVP Specification

Status: Draft for review
Scope: OpenAI Build Week hackathon demo
Last updated: 2026-07-16

## Assumptions

1. CrowdFM is an English-language web application, not a native mobile app. The UI, generated host speech, and hackathon demo are all in English because judging is conducted in English.
2. The hackathon submission prioritizes the isolated demo mode described below. The eventual product remains one shared scheduled station.
3. The server runs as a long-lived Node.js process. The MVP does not target an ephemeral serverless runtime.
4. SQLite and local generated-audio storage are acceptable for the judged demo period.
5. Only curated, license-checked YouTube videos are eligible for selection.
6. A submitted demo request is guaranteed to be selected. Normal broadcasts will not guarantee selection.
7. OpenAI Realtime API is out of scope because the show is produced before broadcast.

## Objective

CrowdFM recreates a radio station with a consistent AI personality. Listeners send a radio name and one free-form message. That message may include a specific song or artist, or describe a mood, moment, or musical direction. The AI host selects a track, responds to the message, and produces a short show containing generated speech and YouTube playback.

The production concept is a single scheduled station that everyone hears live. The hackathon demo compresses that experience: one anonymous submission triggers production of one short, isolated demo show. Once the show is ready, it starts after a short countdown and cannot be paused, rewound, skipped, or scrubbed.

The primary audience for the hackathon demo is a judge who must understand the full causal path without prior setup:

1. Send a message.
2. See the show being produced.
3. Receive an in-page completion notification.
4. Hear the AI host read and respond to the message.
5. Hear the selected YouTube track begin.

## Product Principles

- **A radio station, not a playlist:** the listener does not control playback.
- **Live listening, pre-produced content:** generation happens before airtime; the listening experience follows a server-owned clock.
- **One recognizable host:** a calm, English-speaking, female-presenting radio personality with consistent pacing and tone.
- **Grounded talk:** the host may only use facts attached to the curated catalog entry.
- **Selection is normally scarce:** not every request is chosen outside demo mode.
- **AI disclosure:** the listening UI must clearly state that the personality and voice are AI-generated.

## MVP User Experience

### Request form

The public page requires no account. It accepts:

- `radioName`: 1–30 characters.
- `message`: 20–760 characters containing the listener's story and, optionally, a requested song, artist, mood, moment, or musical direction. There is no separate theme field.

Example:

> I just finished a difficult release after a tense week. I want to enjoy the achievement quietly, so please choose a calm instrumental track.

### Production status

After submission, the same page displays these audience-facing stages:

1. `CHECKING_REQUEST` — Checking your message
2. `PLANNING_SHOW` — Selecting music and planning the show
3. `GENERATING_VOICE` — Recording the AI host
4. `READY` — Your show is ready
5. `ON_AIR` — On Air
6. `ENDED` — Broadcast ended
7. `FAILED` — We couldn't produce this show

When the show becomes ready, the page changes visibly and plays one short notification sound. Browser push notifications and PWA installation are out of scope.

### Broadcast entry

The listener presses a single `Tune in` button before playback. This user gesture initializes HTML audio and the YouTube player so browser autoplay rules do not silently block the broadcast.

When ready, demo mode sets `startsAt` a few seconds in the future and displays a countdown. Playback then follows the server-authored timeline. Custom pause, seek, replay, and skip controls do not exist. YouTube's standard player is embedded through the official IFrame Player API with visible controls disabled.

If a listener reloads or joins late, the client calculates the current segment from the server time and starts at that segment's elapsed offset rather than from the beginning.

## Short Demo Show

The demo show contains one request and one track:

1. Short opening.
2. Radio name and listener message.
3. Host response.
4. Track selection and reason.
5. YouTube track playback.
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
- YouTube IFrame Player API.

The production host must support a long-running Node process and writable persistent storage. A serverless-only deployment is not an MVP target.

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

Generate `preTrackScript` and `postTrackScript` as separate audio assets because the YouTube segment plays between them.

The UI must display `AI-generated host and voice` near the player.

## Curated Track Catalog

The MVP catalog contains 5–10 tracks. Every catalog entry contains:

```ts
const TrackSchema = z.object({
  id: z.string(),
  youtubeVideoId: z.string(),
  title: z.string(),
  artist: z.string(),
  durationMs: z.number().int().positive(),
  startSeconds: z.number().min(0).default(0),
  tags: z.array(z.string()),
  mood: z.array(z.string()),
  hasVocals: z.boolean(),
  verifiedFacts: z.array(z.object({
    text: z.string(),
    sourceUrl: z.string().url(),
  })),
  licenseUrl: z.string().url(),
});
```

The model cannot invent a video ID or choose outside this catalog. Before recording the demo, every video must be manually smoke-tested for embedding, playback, duration, and geographic availability in the demo environment.

## Program Timeline Contract

The browser consumes a discriminated union. It never receives raw model prompts or internal reasoning.

```ts
type ProgramSegment =
  | {
      type: "SPEECH";
      startsAtMs: number;
      durationMs: number;
      audioUrl: string;
      transcript: string;
    }
  | {
      type: "YOUTUBE";
      startsAtMs: number;
      durationMs: number;
      videoId: string;
      startSeconds: number;
      title: string;
      artist: string;
    };

interface ProgramTimeline {
  programId: string;
  startsAt: string;
  durationMs: number;
  isAiVoice: true;
  segments: ProgramSegment[];
}
```

`startsAtMs` is relative to the start of the show. Segments must be ordered, non-overlapping, gap-free, and contained within `durationMs`.

## Server State Model

Internal program states:

```text
QUEUED
  -> MODERATING
  -> PLANNING
  -> SYNTHESIZING_PRE_TRACK
  -> SYNTHESIZING_POST_TRACK
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
- `429 RATE_LIMITED`
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

Streams a generated MP3 asset. It supports byte-range requests and only serves asset IDs belonging to a ready or previously aired program.

Failures:

- `404 AUDIO_NOT_FOUND`
- `416 INVALID_RANGE`

## Playback Algorithm

1. Poll `GET /api/programs/:id` while production is active.
2. Estimate server clock offset from the returned `serverNow`.
3. After the user presses `Tune in`, initialize both audio engines.
4. At or after `startsAt`, calculate `elapsedMs = estimatedServerNow - startsAt`.
5. Select the segment containing `elapsedMs`.
6. For speech, set the HTML audio element's `currentTime` to the segment-relative offset.
7. For YouTube, call `loadVideoById` with the catalog video ID and calculated `startSeconds`.
8. Listen for YouTube `onStateChange`, `onError`, and `onAutoplayBlocked` events.
9. If autoplay is blocked, show a blocking `Tap to return to the broadcast` action.
10. If a segment fails, show a station error and continue to the next segment only when the server timeline says it has started.

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
  catalog/                curated track loading and validation
  db/                     SQLite access and migrations
  openai/                 moderation, planning, and speech adapters
  programs/               state machine, worker, and timeline builder
  youtube/                player adapter and playback calculations
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
    case "SYNTHESIZING_PRE_TRACK":
    case "SYNTHESIZING_POST_TRACK":
      return "GENERATING_VOICE";
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

- Request and catalog validation.
- State-transition legality.
- Structured show-plan validation.
- Timeline ordering, gaps, and duration calculations.
- Late-join segment and offset calculation.
- Display-stage mapping.

### Integration tests

- API contracts with OpenAI and YouTube adapters mocked.
- Moderation rejection does not start production.
- Unknown model-selected track IDs fail safely.
- Failed speech generation produces a stable `FAILED` response.
- Audio range requests.

### End-to-end tests

- Submit an anonymous request.
- Observe production stages.
- Receive ready notification.
- Join the countdown.
- Hear mocked speech followed by a mocked YouTube segment.
- Confirm that playback controls are absent.
- Reload during playback and resume at the calculated broadcast position.

The real OpenAI and YouTube integration is tested manually before recording the submission video. CI must not spend API credits or depend on public video availability.

## Boundaries

### Always

- Validate user input, catalog files, model output, and provider responses.
- Keep the OpenAI API key server-side.
- Disclose that the voice is AI-generated.
- Preserve source and license URLs for every eligible track.
- Log state transitions and provider request IDs without logging full listener messages.

### Ask first

- Add an external database, queue, object store, authentication provider, or email service.
- Change the public REST contract or timeline schema.
- Add arbitrary YouTube search.
- Deploy to a platform without persistent process and storage guarantees.

### Never

- Commit secrets or generated listener data.
- Send the OpenAI API key to the browser.
- Read flagged content on air.
- Let model output select an unregistered video ID.
- Add unsourced artist claims to the script.
- Download, extract, remix, or redistribute YouTube audio.
- Present the AI voice as a human speaker.

## Success Criteria

1. A judge can open a public URL and submit a request without authentication.
2. Invalid or moderated requests fail with a clear, stable error.
3. A valid request produces a schema-valid show plan using `gpt-5.6`.
4. The selected track always belongs to the curated catalog.
5. Two speech assets are generated using `gpt-4o-mini-tts`.
6. The finished program contains a gap-free speech → YouTube → speech timeline.
7. The page shows production progress and an in-page/audio completion notification.
8. The listener enters through one user gesture and sees a scheduled countdown.
9. Playback provides no pause, seek, replay, or skip UI.
10. Reloading during the show resumes at the current broadcast position.
11. AI-voice disclosure and track licensing/source information are visible.
12. The end-to-end demo can be shown coherently in a video shorter than three minutes.

## Out of Scope

- Email request ingestion.
- Native mobile apps and push notifications.
- User accounts.
- Full 30-minute or multi-request shows.
- Arbitrary YouTube search.
- Real-time AI generation.
- Listener reaction processing.
- Human editorial review.
- Multi-client drift correction demonstration.
- Archive playback.

## Open Questions for Review

1. Is a long-lived Node host with SQLite and local audio storage acceptable for the judged deployment, or should storage be externalized before implementation?
2. Which English TTS voice wins the audition among `marin`, `coral`, and `shimmer`?
3. How many seconds before airtime should a ready demo program start?
4. Should the post-track closing wait for the full YouTube track, or should the demo catalog use a deliberately short licensed track?

## Documentation Sources

- OpenAI model guidance: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI text-to-speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI Moderation: https://developers.openai.com/api/docs/guides/moderation
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
