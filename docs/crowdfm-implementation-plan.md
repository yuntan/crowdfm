# CrowdFM MVP Implementation Plan

Status: Draft for human review
Source specification: docs/crowdfm-spec.md
Supporting context: docs/demo-video.md and docs/discussion/crowdfm-product-discussion.md
Planning date: 2026-07-16

## Overview

Build the hackathon demo as one vertical path: an anonymous listener submits a message, the server moderates it, GPT-5.6 selects from a curated licensed catalog and writes a structured show, text-to-speech creates the host segments, and the browser joins a server-timed speech → YouTube → speech broadcast.

The repository currently contains documentation only. The plan therefore begins with a minimal Next.js and test foundation, then extends a working user path in small increments. The MVP runs and is verified locally; cloud deployment and public hosting are not part of this plan. It deliberately defers final track selection, multi-request shows, authentication, arbitrary YouTube search, realtime generation, archive playback, and multi-client drift correction.

## Verified Platform Assumptions

- Use Next.js 16.2.x with the App Router and Node.js Route Handlers. Dynamic segment params are promises and must be awaited.
- Mark server-only routes and modules for the Node.js runtime. Run the demo locally with a long-lived process, SQLite, and writable local generated-audio storage.
- Use the official OpenAI JavaScript SDK. GPT-5.6 is the current production recommendation; the gpt-5.6 alias routes to the flagship GPT-5.6 model. Start show planning with reasoning effort low and change it only after an eval.
- Use Responses API Structured Outputs with a Zod-backed schema. Still validate the selected track ID against the local catalog after parsing.
- Moderate listener text before show planning with omni-moderation-latest.
- Generate pre-track and post-track speech separately with gpt-4o-mini-tts.
- Use YouTube IFrame Player API object-form loadVideoById with startSeconds and endSeconds, and handle onStateChange, onError, and onAutoplayBlocked.

Current references:

- https://github.com/vercel/next.js/blob/v16.2.9/docs/01-app/01-getting-started/15-route-handlers.mdx
- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/moderation
- https://developers.openai.com/api/docs/guides/text-to-speech
- https://developers.google.com/youtube/iframe_api_reference

## Architecture Decisions

- Contract-first domain core: Zod schemas and discriminated unions define requests, program state, show plans, catalog entries, and timelines before routes or UI consume them.
- One local process for the MVP: Next.js and the production worker run on the demo machine in one long-lived Node.js process. SQLite and generated MP3 files remain local.
- Provider isolation: OpenAI, YouTube, clock, ID generation, and asset storage sit behind narrow adapters so unit and integration tests never spend credits or depend on public videos.
- Server-owned timeline: READY atomically fixes startsAt to READY time plus 15 seconds and persists an immutable, gap-free segment list. The browser derives the current segment from estimated server time.
- Safety before generation: normalize, validate, and moderate listener input before it reaches the planning prompt. Treat listener text as quoted data.
- Curated media only: the model selects a catalog ID, never a URL or video ID. Catalog records carry verified facts, sources, and license URLs.
- Audience-safe API: public responses exclude prompts, moderation scores, provider bodies, stack traces, secrets, and full internal failure details.

## Dependency Graph

~~~
Toolchain and runtime
    ├── Domain contracts and state machine
    │       ├── Curated catalog
    │       ├── SQLite persistence
    │       │       └── Anonymous request flow
    │       │               └── Moderation gate
    │       │                       └── Structured show planning
    │       │                               └── Speech generation
    │       │                                       └── Worker and timeline
    │       │                                               ├── Program status UI
    │       │                                               ├── Audio streaming
    │       │                                               └── Playback engine
    │       │                                                       └── Live player
    │       └── Display-stage mapping ──────────────────────────────┘
    └── Test and environment harness
~~~

## Project-wide Definition of Done

Every implementation task is complete only when:

- Its acceptance criteria pass and the targeted automated test is committed with the behavior.
- pnpm lint, pnpm typecheck, and the relevant pnpm test selection pass.
- pnpm build still succeeds at the phase checkpoint.
- External provider calls are mocked in automated tests.
- No secret, generated listener audio, full listener message, or provider response body is committed or logged.
- New public behavior or setup requirements are reflected in README or the relevant docs.

## Phase 1: Foundation and Risk Reduction

### Task 1: Scaffold the Next.js workspace

**Description:** Create the smallest runnable Next.js 16.2.x TypeScript application and authoritative pnpm commands without adding product behavior.

**Acceptance criteria:**
- [ ] The app renders a minimal CrowdFM page under the App Router.
- [ ] dev, build, lint, typecheck, test, and test:e2e scripts exist.
- [ ] TypeScript strict mode is enabled and generated audio plus environment files are ignored.

**Verification:**
- [ ] pnpm lint
- [ ] pnpm typecheck
- [ ] pnpm build

**Dependencies:** None

**Files likely touched:** package.json, pnpm-lock.yaml, tsconfig.json, app/layout.tsx, app/page.tsx

**Estimated scope:** Medium, 5 files

### Task 2: Establish environment and test boundaries

**Description:** Add validated server configuration, a Node-runtime health route, Vitest, and Playwright so later slices can be verified without real providers.

**Acceptance criteria:**
- [ ] Missing or malformed server configuration fails at a typed boundary with no secret values in the error.
- [ ] The health route proves Node runtime execution and writable generated-audio directory access.
- [ ] One unit test runs through the authoritative test command.

**Verification:**
- [ ] pnpm test -- tests/unit/env.test.ts
- [ ] pnpm build

**Dependencies:** Task 1

**Files likely touched:** lib/env.ts, .env.example, vitest.config.ts, app/api/health/route.ts, tests/unit/env.test.ts

**Estimated scope:** Medium, 5 files

## Checkpoint A1: Runnable Runtime

- [ ] pnpm lint, pnpm typecheck, pnpm test, and pnpm build pass.
- [ ] The health route confirms Node runtime and writable local storage.
- [ ] No product feature code exists outside the validated foundation.

### Task 3: Define program contracts and legal state transitions

**Description:** Implement branded IDs, request and program schemas, display-stage mapping, and the monotonic state machine independently of storage and providers.

**Acceptance criteria:**
- [ ] Every specified internal status maps exhaustively to an audience display stage.
- [ ] Only legal forward transitions are accepted; retry attempts cannot move a state backward.
- [ ] Public program and timeline schemas exclude internal prompts and provider data.

**Verification:**
- [ ] pnpm test -- tests/unit/state-machine.test.ts
- [ ] pnpm typecheck

**Dependencies:** Tasks 1–2

**Files likely touched:** lib/api/contracts.ts, lib/programs/types.ts, lib/programs/state-machine.ts, lib/programs/display-stage.ts, tests/unit/state-machine.test.ts

**Estimated scope:** Medium, 5 files

### Task 4: Validate the curated track catalog

**Description:** Create the catalog boundary and a small test catalog so invalid video IDs, durations, facts, sources, or license records fail before production starts.

**Acceptance criteria:**
- [ ] Catalog loading validates every field in the specification and rejects duplicate track IDs.
- [ ] Only eligible catalog IDs can be resolved for planning and playback.
- [ ] The fixture includes source and license URLs, startSeconds 0, a valid endSeconds near the first chorus, and no unverified artist claims.

**Verification:**
- [ ] pnpm test -- tests/unit/catalog.test.ts
- [ ] Manual check: inspect each fixture source and license field

**Dependencies:** Tasks 2–3

**Files likely touched:** lib/catalog/schema.ts, lib/catalog/load.ts, data/catalog.json, tests/unit/catalog.test.ts

**Estimated scope:** Small, 4 files

## Checkpoint A2: Domain Foundation

- [ ] pnpm lint, pnpm typecheck, pnpm test, and pnpm build pass.
- [ ] The app, SQLite database, worker, and generated-audio directory operate entirely on the local demo machine.
- [x] Automated work uses mock fixtures; the real provider uses the rights-recorded catalog in `data/suno-tracks.json` while master audio remains ignored.

## Phase 2: Submit and Moderate a Request

### Task 5: Persist requests, programs, and attempts

**Description:** Add SQLite migrations and repository methods for listener requests, program states, production attempts, timelines, and generated asset metadata.

**Acceptance criteria:**
- [ ] A transaction creates one request, one queued program, and the first attempt atomically.
- [ ] State updates enforce the domain transition rules and retain failure metadata without storing provider bodies.
- [ ] Repository tests run against an isolated temporary database.

**Verification:**
- [ ] pnpm test -- tests/integration/db.test.ts
- [ ] Manual check: restart the test server and read back a queued program

**Dependencies:** Task 3

**Files likely touched:** lib/db/migrations.ts, lib/db/database.ts, lib/db/repositories.ts, tests/integration/db.test.ts

**Estimated scope:** Small, 4 files

### Task 6: Deliver the anonymous request creation slice

**Description:** Connect the anonymous local form to POST /api/requests with shared validation and stable API errors, stopping at a persisted queued program.

**Acceptance criteria:**
- [ ] A valid radio name and message return 201 with requestId, programId, and QUEUED.
- [ ] Invalid lengths and malformed JSON return the documented 422 error shape.
- [ ] The English UI needs no account and navigates to the created program page.

**Verification:**
- [ ] pnpm test -- tests/integration/create-request.test.ts
- [ ] Manual check: submit the documented Sleepless Engineer example

**Dependencies:** Tasks 2, 3, and 5

**Files likely touched:** app/page.tsx, components/request-form.tsx, app/api/requests/route.ts, lib/api/request-schema.ts, tests/integration/create-request.test.ts

**Estimated scope:** Medium, 5 files

### Task 7: Insert the moderation gate

**Description:** Normalize and moderate listener text before planning; rejected or unavailable moderation must never start show generation.

**Acceptance criteria:**
- [ ] Flagged input transitions to REJECTED and returns a generic audience-safe error.
- [ ] Moderation failure produces a stable failure and no planning call.
- [ ] Logs include the program and provider request IDs but not the full listener message or category scores.

**Verification:**
- [ ] pnpm test -- tests/integration/moderation.test.ts
- [ ] Manual check: verify mocked flagged input never invokes the planner

**Dependencies:** Tasks 5–6

**Files likely touched:** lib/openai/moderation.ts, lib/programs/moderate-request.ts, app/api/requests/route.ts, tests/integration/moderation.test.ts

**Estimated scope:** Small, 4 files

## Checkpoint B: Safe Submission

- [ ] A valid request reaches MODERATING and then the next production state.
- [ ] Invalid and flagged requests display stable, non-sensitive errors.
- [ ] No OpenAI credit is spent by automated tests.

## Phase 3: Produce a Ready Program

### Task 8: Plan a schema-valid show

**Description:** Implement the GPT-5.6 Responses API adapter, host persona, structured show-plan schema, and post-parse catalog membership check.

**Acceptance criteria:**
- [ ] The planner accepts only sanitized listener data, the fixed persona, the complete eligible catalog, and verified track facts.
- [ ] A valid response parses through Zod and references an eligible track ID.
- [ ] Refusal, malformed output, or unknown track ID fails safely without starting speech generation.

**Verification:**
- [ ] pnpm test -- tests/integration/show-planner.test.ts
- [ ] Manual check: one real request with reasoning effort low returns the documented schema

**Dependencies:** Tasks 4 and 7

**Files likely touched:** lib/openai/show-planner.ts, lib/openai/show-plan-schema.ts, lib/programs/host-persona.ts, tests/integration/show-planner.test.ts

**Estimated scope:** Small, 4 files

### Task 9: Generate and store two speech assets

**Description:** Convert pre-track and post-track scripts into MP3 through gpt-4o-mini-tts and store them behind opaque asset IDs.

**Acceptance criteria:**
- [ ] Exactly two speech requests are created for a successful plan with the configured voice and instructions.
- [ ] Partial generation failure leaves no ready timeline and records a failed attempt.
- [ ] Stored metadata includes duration and ownership but never exposes a filesystem path to the browser.

**Verification:**
- [ ] pnpm test -- tests/integration/speech-assets.test.ts
- [ ] Manual check: audition marin, coral, and shimmer with the same English script

**Dependencies:** Tasks 2, 5, and 8

**Files likely touched:** lib/openai/speech.ts, lib/programs/asset-store.ts, lib/programs/generate-speech.ts, tests/integration/speech-assets.test.ts

**Estimated scope:** Small, 4 files

### Task 10: Orchestrate production and build the timeline

**Description:** Implement the in-process worker that advances one attempt through moderation, planning, speech generation, and an immutable scheduled timeline.

**Acceptance criteria:**
- [ ] State transitions are monotonic and restart-safe; only the worker advances production states.
- [ ] A successful attempt enters READY with startsAt set to exactly 15 seconds after READY time and persists a gap-free speech → YouTube excerpt → speech timeline.
- [ ] Duplicate worker pickup cannot create duplicate ready assets or a second successful timeline.

**Verification:**
- [ ] pnpm test -- tests/integration/production-worker.test.ts
- [ ] pnpm test -- tests/unit/timeline.test.ts
- [ ] Manual check: kill and restart the worker during a mocked attempt

**Dependencies:** Tasks 3, 5, 7, 8, and 9

**Files likely touched:** lib/programs/worker.ts, lib/programs/timeline-builder.ts, lib/db/repositories.ts, tests/unit/timeline.test.ts, tests/integration/production-worker.test.ts

**Estimated scope:** Medium, 5 files

## Checkpoint C: Program Ready

- [ ] One valid request reaches READY with two speech assets and one catalog track.
- [ ] Timeline validation proves ordering, no overlaps, no gaps, and total duration containment.
- [ ] READY always produces a 15-second ready-to-air countdown.

## Phase 4: Join and Hear the Broadcast

### Task 11: Expose status and production progress

**Description:** Implement GET /api/programs/:programId and the polling UI, including serverNow, display stages, ready notification, and audience-safe failure responses.

**Acceptance criteria:**
- [ ] Dynamic params are awaited and unknown IDs return the stable public error shape.
- [ ] Active responses include serverNow; READY adds the validated public timeline.
- [ ] The page shows every specified audience stage and plays one notification sound on first transition to READY.

**Verification:**
- [ ] pnpm test -- tests/integration/program-status.test.ts
- [ ] Manual check: observe every mocked production stage through READY in the browser

**Dependencies:** Tasks 3 and 10

**Files likely touched:** app/api/programs/[programId]/route.ts, app/programs/[id]/page.tsx, components/production-status.tsx, tests/integration/program-status.test.ts

**Estimated scope:** Small, 4 files

### Task 12: Stream authorized MP3 ranges

**Description:** Add GET /api/audio/:assetId with ownership checks, ready-or-aired authorization, correct MP3 headers, and byte-range support.

**Acceptance criteria:**
- [ ] Full and valid partial requests return correct status, content length, content range, and MIME headers.
- [ ] Invalid ranges return 416 and unknown or unauthorized assets return 404.
- [ ] The route cannot traverse paths or serve arbitrary local files.

**Verification:**
- [ ] pnpm test -- tests/integration/audio-route.test.ts
- [ ] Manual check: seek-free HTML audio can start from a non-zero currentTime

**Dependencies:** Tasks 5, 9, and 10

**Files likely touched:** app/api/audio/[assetId]/route.ts, lib/programs/asset-store.ts, tests/integration/audio-route.test.ts

**Estimated scope:** Small, 3 files

## Checkpoint D1: Audience Delivery APIs

- [ ] Status polling reaches READY using the public timeline contract.
- [ ] Speech assets stream in full and by valid byte range.
- [ ] Public responses reveal no internal prompt, provider body, or filesystem path.

### Task 13: Implement deterministic playback calculations

**Description:** Build pure clock-offset, segment-selection, late-join, and bounded YouTube excerpt functions plus a narrow IFrame Player adapter.

**Acceptance criteria:**
- [ ] Boundary timestamps select the correct segment and segment-relative offset.
- [ ] Late joins and reloads calculate speech currentTime or a YouTube startSeconds that remains before the catalog endSeconds.
- [ ] The adapter handles ready, state change, error, and autoplay-blocked events without exposing pause, seek, replay, or skip controls.

**Verification:**
- [ ] pnpm test -- tests/unit/playback.test.ts
- [ ] pnpm test -- tests/unit/youtube-adapter.test.ts

**Dependencies:** Tasks 3–4 and 10

**Files likely touched:** lib/programs/playback.ts, lib/youtube/player-adapter.ts, tests/unit/playback.test.ts, tests/unit/youtube-adapter.test.ts

**Estimated scope:** Small, 4 files

### Task 14: Deliver the scheduled live-player slice

**Description:** Connect Tune in, the fixed 15-second countdown, speech audio, the beginning-to-chorus YouTube excerpt, closing speech, reload recovery, and visible disclosure/license information into the program page.

**Acceptance criteria:**
- [ ] One Tune in gesture initializes both audio engines and playback starts at the server-authored position.
- [ ] Autoplay blocking presents Tap to return to the broadcast and resumes at the current position.
- [ ] Playback leaves YouTube at the configured endSeconds, starts the closing speech, and visibly shows AI disclosure plus track source and license links.

**Verification:**
- [ ] pnpm test:e2e -- e2e/broadcast.spec.ts
- [ ] Manual check: reload during speech and during YouTube, then confirm current-position recovery
- [ ] Manual check: confirm no custom pause, seek, replay, or skip controls exist

**Dependencies:** Tasks 11–13

**Files likely touched:** components/live-player.tsx, components/track-credits.tsx, app/programs/[id]/page.tsx, e2e/broadcast.spec.ts, playwright.config.ts

**Estimated scope:** Medium, 5 files

## Checkpoint D2: End-to-End Demo

- [ ] Submit → moderate → plan → synthesize → ready → countdown → speech → YouTube → speech works in one browser flow.
- [ ] Reload resumes at the current broadcast position.
- [ ] The mocked end-to-end suite passes without network or API credits.
- [ ] The real candidate YouTube video embeds and plays in the demo region.

## Phase 5: Harden and Ship

### Task 15: Add operational failure handling

**Description:** Add structured transition logging, provider error mapping, and stale-attempt recovery needed for a reliable local demo.

**Acceptance criteria:**
- [ ] Provider timeouts and unavailable services map to stable FAILED or 503 responses with retry-safe attempts.
- [ ] Logs are sufficient to trace state transitions and provider request IDs without listener text or secrets.
- [ ] A local process restart can safely resume or fail an incomplete production attempt without duplicating assets.

**Verification:**
- [ ] pnpm test -- tests/integration/failures.test.ts
- [ ] Manual check: inject moderation, planning, speech, disk, and YouTube failures

**Dependencies:** Tasks 7–14

**Files likely touched:** lib/programs/logger.ts, lib/openai/errors.ts, lib/programs/worker.ts, tests/integration/failures.test.ts

**Estimated scope:** Small, 4 files

### Task 16: Package the judged release

**Description:** Add local run instructions, sample data guidance, demo configuration, and the final browser/video checklist.

**Acceptance criteria:**
- [ ] A clean local install runs lint, typecheck, unit, integration, build, and mocked end-to-end tests without cloud services.
- [ ] README explains local setup, SQLite/audio paths, sample data, OpenAI usage, Codex decisions, and demo operation.
- [ ] A fresh local browser profile can complete the demo and all rights/disclosure checks are documented.

**Verification:**
- [ ] Run every authoritative command from a clean install
- [ ] Execute the docs/demo-video.md recording checklist
- [ ] Record three successful real-provider demo runs before filming

**Dependencies:** Tasks 1–15

**Files likely touched:** README.md, docs/local-demo.md, .env.example, data/catalog.json, docs/demo-video.md

**Estimated scope:** Medium, 5 files

## Checkpoint E: Release Candidate

- [ ] All project-wide Definition of Done checks pass.
- [ ] Local demo URL works without authentication or cloud infrastructure.
- [ ] No secret, private path, email address, or unrelated browser tab appears in the video.
- [ ] Demo video is under three minutes and verbally explains both GPT-5.6 and Codex.
- [ ] Human approves the final track rights, excerpt boundaries, TTS voice, README, and Devpost submission.

## Parallelization Opportunities

- After Task 3, Task 4 catalog validation and Task 5 persistence can proceed independently.
- After Task 10 fixes the public timeline, Task 12 audio streaming and Task 13 playback calculations can proceed independently.
- Task 11 UI can be developed against a fixed mocked status sequence while Task 10 worker internals are completed, but the public contract must not change.
- README and local-run documentation in Task 16 can start after Checkpoint C, while final screenshots and commands wait for Checkpoint D.
- Tasks sharing lib/programs/types.ts, lib/db/repositories.ts, or app/programs/[id]/page.tsx must be sequential or coordinated explicitly.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Local demo process or machine stops during production | High | Use a stable working directory, persist attempt phases, add a preflight check, and test restart recovery |
| Track is unlicensed, unembeddable, deleted, or region-blocked | High | Smoke-test every catalog entry manually; keep at least two approved fallback tracks |
| TTS and planning exceed the demo wait budget | High | Measure real latency early, keep prompts/catalog small, generate two assets concurrently only if attempt semantics remain deterministic |
| Worker dies after a provider succeeds but before persistence | High | Persist attempt phases and make asset/timeline writes idempotent; test restart at Task 10 |
| Browser blocks scripted playback | Medium | Require Tune in, initialize both engines, handle onAutoplayBlocked, and provide a single recovery action |
| YouTube starts near rather than exactly at startSeconds | Medium | Treat keyframe offset as expected; avoid frame-perfect transitions and choose forgiving audio boundaries |
| Listener text leaks through errors or logs | High | Centralize audience-safe error mapping and redaction; test logs with sentinel private text |
| Model returns a valid schema with a fabricated track ID or unsupported claim | High | Recheck catalog membership and provide only verified facts; fail closed before TTS |
| Per-track chorus boundary is mistimed or unsuitable | Medium | Store endSeconds per catalog entry and smoke-test the excerpt locally before recording |

## Open Questions Requiring Human Decisions

1. Which 5–10 tracks have confirmed licenses, embed support, duration, and local demo availability?
2. What endSeconds near the first chorus should each selected track use?
3. Which voice wins the English audition among marin, coral, and shimmer?

## Plan Review Gate

Implementation should begin only after the human confirms:

- [ ] Task order and MVP scope are acceptable.
- [ ] Final track selection and excerpt-boundary decisions have an owner and deadline.
- [ ] Open questions 1–3 have provisional answers or explicit deadlines.
- [ ] No task is expected to exceed one focused session without being split again.
