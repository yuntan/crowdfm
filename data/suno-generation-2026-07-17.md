# Suno generation batch — 2026-07-17

Purpose: Generate candidate tracks for the CrowdFM hackathon demo catalog.

Generation settings:

- Provider: Suno web application
- Model: v5.5
- Plan at generation: Pro Plan
- Workspace: My Workspace
- Submission language: English
- Batch record updated at: 2026-07-17T21:00:36+09:00
- Local MP3 directory: `assets/`
- Local filename convention: `<Suno song ID>.mp3`
- Candidate policy: one generation request per theme; Suno may return multiple candidates
- Editorial constraint: no named artist references; each track should establish a clear hook or refrain early enough for a short radio excerpt

The generated tracks are candidates only. A track must not be promoted to the runtime `tracks.json` until its audio quality, duration, excerpt boundary, source URL, and rights evidence have been reviewed manually.

Automated first-pass analysis was completed on 2026-07-18 with `pnpm import:suno`. The selected tracks and inferred excerpt boundaries are stored in `data/suno-tracks.json`; measurements and both-candidate rankings are stored in `data/suno-analysis.json`. This does not represent a human listening review.

## 1. Quiet Victory

- Theme: Quiet satisfaction after completing something difficult
- Instrumental: Yes
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Small Win Tonight — candidate A](https://suno.com/song/9b6c8d86-0dce-439b-a38b-662acb207372)
  - [Small Win Tonight — candidate B](https://suno.com/song/58e0cf9b-c386-486b-9690-73032461604e)
- Prompt:

> Warm downtempo indie-electronic instrumental at 82 BPM for a quiet private victory after a difficult week. Intimate felt piano, soft analog synth pads, muted electric guitar, rounded bass, and restrained brushed drums. Begin sparse and reflective, then reveal a memorable hopeful melodic hook within 35 seconds. Calm, warm, polished, emotionally uplifting without becoming triumphant or loud. No vocals, no spoken words, no dramatic trailer-style climax.

## 2. First Light

- Theme: A hopeful new beginning
- Instrumental: No
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Porchlight on the Map — candidate A](https://suno.com/song/cf45946c-e076-4485-9251-67fceaffb3ff)
  - [Porchlight on the Map — candidate B](https://suno.com/song/c2fdbec1-5a97-40c5-a951-559002856f63)
- Prompt:

> Hopeful English folk-pop at 104 BPM about taking a first step into a new chapter after uncertainty. Warm acoustic guitar, light piano, subtle hand percussion, melodic bass, and airy harmonies. Intimate conversational verses lead to a clear, singable chorus within 40 seconds. The lyrics should feel specific and sincere, using images of morning light and an open road without sounding motivational or clichéd. Bright, human, gently energizing, polished radio mix.

## 3. After Hours Focus

- Theme: Deep concentration late at night
- Instrumental: Yes
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Midnight Compiler — candidate A](https://suno.com/song/740aae4b-4689-46d2-8585-dd91341894f0)
  - [Midnight Compiler — candidate B](https://suno.com/song/2addf544-d4fd-4f32-939f-e3fe427799b2)
- Prompt:

> Late-night lo-fi jazzhop instrumental at 74 BPM for focused study and coding. Dusty drums, warm Rhodes chords, upright bass, soft vibraphone accents, and a restrained clean-guitar motif. Establish a memorable repeating hook within 30 seconds, then develop it through subtle harmonic changes. Cozy, steady, thoughtful, slightly nocturnal, with gentle tape texture but a clean enough mix for radio. No vocals, no speech, no distracting solos.

## 4. Exhale

- Theme: Release after sustained pressure
- Instrumental: No
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Finally Exhaling — candidate A](https://suno.com/song/519c119d-c065-4c21-ba80-45f80c20364d)
  - [Finally Exhaling — candidate B](https://suno.com/song/78e25b31-9bb6-47dd-aa8d-156e86055d8a)
- Prompt:

> English alternative pop with electronic-rock lift at 118 BPM, about finally exhaling after a tense week and allowing yourself to feel proud. Start with close, restrained vocals over pulsing synth and muted guitar; build naturally into an open, cathartic chorus within 40 seconds with live drums, wide guitars, and luminous synth layers. The emotion is relief rather than rebellion. Honest, modern, energetic, memorable, and suitable for a radio show without aggressive distortion.

## 5. Rain on the Window

- Theme: Solitude and gentle reflection on a rainy day
- Instrumental: Yes
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Rain on Oak Glass — candidate A](https://suno.com/song/19149b9a-b6ad-4a5b-8bf7-1dc7aa5ed023)
  - [Rain on Oak Glass — candidate B](https://suno.com/song/2c2e6b1d-876d-4f6a-b5aa-cd2436ee2985)
- Prompt:

> Reflective ambient chamber instrumental at 68 BPM for watching rain alone and sorting through complicated feelings. Felt piano carries a simple motif, joined by soft cello, distant electric-piano tones, and nearly weightless brushed percussion. Introduce a gentle recognizable refrain within 35 seconds. Melancholic but comforting, spacious, intimate, organic, and quietly beautiful. No vocals, no spoken words, no thunder sound effects, no huge cinematic swell.

## 6. Neon Miles

- Theme: A solitary drive through the city at night
- Instrumental: Yes
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Midnight Overpass — candidate A](https://suno.com/song/059cb76a-2358-4b2d-93d3-488e608c4409)
  - [Midnight Overpass — candidate B](https://suno.com/song/ee75b680-f816-4d46-8eae-f090d1673ba6)
- Prompt:

> Cinematic synthwave instrumental at 105 BPM for a solitary night drive through a glowing city. Steady analog bass pulse, crisp restrained drums, glassy arpeggios, warm synth pads, and a strong melodic lead hook arriving within 35 seconds. Sleek and forward-moving with a hint of nostalgia, but not dark, ominous, or bombastic. Polished wide mix, smooth transitions, no vocals, no spoken samples, no retro parody.

## 7. Same Room Again

- Theme: Reconnecting with someone important
- Instrumental: No
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Bus Stop Laugh — candidate A](https://suno.com/song/189163c9-9f2e-446d-95b5-192b50012f26)
  - [Bus Stop Laugh — candidate B](https://suno.com/song/45e5483e-f3c7-45e1-a76f-a5cccb51d5f6)
- Prompt:

> Warm English neo-soul and contemporary R&B at 92 BPM about meeting an old friend again and discovering that the connection survived the distance. Rhodes piano, clean guitar, deep melodic bass, pocket drums, subtle brass accents, and rich background harmonies. Relaxed conversational verse followed by a memorable affectionate chorus within 40 seconds. Mature gratitude, gentle humor, and warmth; avoid romance clichés and vocal showboating. Intimate, soulful, polished radio mix.

## 8. Step Into It

- Theme: Finding courage immediately before a difficult moment
- Instrumental: No
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Count The Seconds — candidate A](https://suno.com/song/c255e832-7c41-461c-827c-89b6b8fc67dc)
  - [Count The Seconds — candidate B](https://suno.com/song/ac3d2689-496d-4f96-8fa0-288485026440)
- Prompt:

> English cinematic electronic rock at 124 BPM about finding courage in the seconds before stepping into a difficult moment. Begin with a heartbeat-like electronic pulse, focused vocal, and minimal guitar; build into a powerful melodic chorus within 40 seconds with live drums, bright synths, and controlled distorted guitars. Determined rather than angry, vulnerable rather than heroic. Modern, propulsive, emotionally direct, with a clean radio-ready mix and no trailer-music bombast.

## 9. Open Saturday

- Theme: A carefree weekend with nowhere to be
- Instrumental: No
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T15:44:06+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [Wide Open Wonder](https://suno.com/song/dd55f196-c395-4650-8179-781bf0f71176)
  - [Saturday Drift](https://suno.com/song/b9b17b23-7c47-427d-a2dd-9063586146f9)
- Prompt:

> Bright English funk-pop and modern disco at 116 BPM about waking up on a Saturday with no schedule and following the day wherever it goes. Tight live bass, clean rhythm guitar, sparkling electric piano, punchy drums, handclaps, and playful horn accents. Get to an irresistible compact chorus within 35 seconds. Breezy, witty, inclusive, and joyful without sounding childish or like a party commercial. Crisp, warm, danceable radio production.

## 10. Carry the Good Parts

- Theme: A bittersweet farewell shaped by gratitude
- Instrumental: No
- Status: Generated (2 candidates; editorial review pending)
- Generated at: 2026-07-17T21:00:36+09:00 (batch record; generated minutes earlier)
- Song URLs:
  - [The Green Room Key — candidate A](https://suno.com/song/96a5014e-33fa-4563-8052-f862d1f22869)
  - [The Green Room Key — candidate B](https://suno.com/song/1860a6da-1467-43ef-9fc8-b89dc1b602d2)
- Prompt:

> Intimate English acoustic indie ballad at 76 BPM about leaving a place or chapter behind while carrying its good memories forward. Fingerpicked acoustic guitar, close natural vocal, soft piano, upright bass, brushed drums, and restrained strings. Let the first chorus arrive within 45 seconds and widen gently without becoming oversized. Bittersweet, grateful, specific, and emotionally mature; avoid melodrama, breakup clichés, and overly ornate singing. Warm organic radio mix. Keep the opening concise so the emotional refrain arrives early.
