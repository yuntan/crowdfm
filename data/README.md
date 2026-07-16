# Curated track catalog

`tracks.json` stays empty until the demo tracks are chosen. Real OpenAI mode refuses to run with an empty or invalid catalog; mock mode remains fully usable.

Add 5–10 manually verified entries in this shape:

```json
[
  {
    "id": "stable-editorial-id",
    "youtubeVideoId": "verifiedVideoId",
    "title": "Track title",
    "artist": "Artist",
    "durationMs": 180000,
    "startSeconds": 0,
    "endSeconds": 42.5,
    "tags": ["uplifting"],
    "mood": ["warm"],
    "hasVocals": true,
    "licenseUrl": "https://license-source.example/record",
    "sourceUrl": "https://www.youtube.com/watch?v=verifiedVideoId"
  }
]
```

Before recording the demo, verify each entry locally:

- Embedding is allowed and playback works in the demo region.
- `durationMs` matches the source.
- `startSeconds` is `0`.
- `endSeconds` is after the start and at or just after the first chorus begins.
- Source and license URLs are accurate and reviewable.
