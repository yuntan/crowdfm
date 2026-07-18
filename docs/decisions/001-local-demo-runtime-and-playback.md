# ADR-001: Run the MVP locally with fixed countdown and track excerpts

## Status

Accepted; YouTube playback portions superseded by ADR-002

## Date

2026-07-16

## Context

CrowdFM is being built for a short OpenAI Build Week demonstration. A cloud deployment would add hosting, persistence, secret management, and operational work that does not improve the recorded core experience. The demo also needs a predictable gap between production completion and airtime, plus enough music to show that the AI host's choice becomes a real broadcast without making the show or video wait for a full track.

The concrete tracks have not been selected yet, so the playback contract must support per-track excerpt boundaries without depending on a specific song.

## Decision

1. Run and verify the MVP only on the developer's local machine. Do not deploy it to a cloud environment.
2. Use one long-lived local Node.js process with local SQLite and a local generated-audio directory.
3. When a program enters `READY`, set `startsAt` to exactly 15 seconds after the recorded READY timestamp.
4. Play each selected YouTube track from the beginning, with `startSeconds = 0`.
5. Store an `endSeconds` value per catalog entry at or just after the first chorus begins. The YouTube timeline segment duration is `(endSeconds - startSeconds) * 1000`.
6. Use object-form YouTube `loadVideoById` with the calculated resume offset and fixed `endSeconds`, then switch to the closing speech at the server-authored boundary.
7. Choose the actual tracks and their `endSeconds` values later, before real-provider demo recording.

## Alternatives Considered

### Cloud deployment

- Pros: A public URL would be easier for remote judges to open.
- Cons: Requires deployment, persistent storage, secret management, and production operations outside the core demo.
- Rejected: Local execution and a recorded public demo are sufficient for the current scope.

### Variable or shorter countdown

- Pros: Reduces waiting time.
- Cons: Makes the demonstration less predictable and gives the listener less time to press Tune in and understand that airtime is fixed.
- Rejected: A fixed 15-second countdown is simple to explain and test.

### Play the full track

- Pros: Closest to a traditional radio broadcast.
- Cons: Makes the demo show too long and delays the closing speech.
- Rejected: The judged experience needs a compact but real music segment.

### Start near the chorus

- Pros: Reaches the most recognizable section faster.
- Cons: Removes the musical buildup and weakens the feeling of listening to a radio selection from its beginning.
- Rejected: Start at zero and end around the first chorus instead.

## Consequences

- Deployment tasks, public-host checks, distributed rate limiting, and cloud storage are outside the MVP.
- README and demo instructions must provide a reproducible local setup and preflight check.
- Timeline tests must prove the READY-plus-15-seconds rule and exact excerpt duration.
- Catalog validation must enforce `startSeconds = 0 < endSeconds <= durationMs / 1000`.
- Every final candidate track needs a local smoke test for licensing, embedding, regional availability, duration, chorus boundary, and transition into closing speech.
- Reloading during the excerpt must calculate a resume position that remains before `endSeconds`.
- If the MVP later becomes publicly hosted, a new ADR must define infrastructure, persistence, abuse protection, and operational ownership.
