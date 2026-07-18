# ADR-002: Assemble generated music and host speech into one program audio file

## Status

Accepted; supersedes the YouTube playback portions of ADR-001

## Date

2026-07-17

## Context

The original MVP switched between two generated host MP3s and an embedded YouTube track. That made the browser coordinate two media engines and introduced embedding, availability, buffering, and third-party playback constraints. CrowdFM can instead prepare original music with Suno, retain it locally, and combine the selected excerpt with the host speech before airtime.

Suno Platform access is not currently provisioned for the project account, and its authenticated API contract and output-rights terms cannot be verified publicly. Runtime music generation is unnecessary for demonstrating message-driven selection from a curated catalog.

## Decision

1. Generate and review 5–10 Suno songs before the demo; choose the final songs later.
2. Admit a song to the catalog only when its generation-time rights permit the public hackathon submission and its provenance and rights evidence are retained.
3. Do not depend on Suno Platform API during listener-request production.
4. Keep the beginning-to-first-chorus excerpt rule from ADR-001.
5. Generate pre-track and post-track speech separately, then use local FFmpeg to normalize, trim, and concatenate speech → music → speech into one final MP3.
6. Enter `READY` only after the final file has been probed, persisted, and attached to a cue timeline. Set airtime to 15 seconds after `READY`, as established by ADR-001.
7. Serve only the final program asset to the browser and play it with one HTML audio element.

## Alternatives Considered

### Keep YouTube playback

- Pros: No local music file preparation or audio assembly.
- Cons: Two playback engines, external availability, and no ability to produce one coherent program asset.
- Rejected: The generated catalog removes the need for YouTube in the demo.

### Generate a new song for every request

- Pros: Music could match each message more precisely.
- Cons: Adds latency, cost, provider availability, API-access, moderation, and rights uncertainty to the critical path.
- Rejected: Pre-generated selection is more reliable for the MVP.

### Assemble media in the browser

- Pros: Avoids a local FFmpeg prerequisite.
- Cons: Browser codec differences and multiple media sources make scheduled playback and reload recovery less deterministic.
- Rejected: Server-side assembly produces a single testable artifact before airtime.

## Consequences

- The catalog stores local audio metadata, Suno provenance, and rights evidence instead of YouTube identifiers.
- Production adds `ASSEMBLING_AUDIO`, and assembly failure prevents `READY`.
- Late joining seeks once into the final MP3; cues only update visible program metadata.
- FFmpeg and ffprobe become local demo prerequisites.
- Automated tests use fixture audio and a fake assembly adapter; they never invoke Suno or spend credits.
- The implementation plan, demo script, and current YouTube-based code require a follow-up migration before they conform to this decision.
