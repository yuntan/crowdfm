# Curated track catalog

`suno-tracks.json` is the validated catalog consumed by the real OpenAI provider. `tracks.json` is an unused legacy placeholder and remains empty. Mock mode does not require either catalog or any master audio.

The Suno preparation workflow uses:

- `suno-generation-2026-07-17.md`: prompts, source URLs, model, and generation-time plan.
- `../assets/<Suno song ID>.mp3`: the 20 local candidate masters.
- `suno-analysis.json`: reproducible measurements and ranked A/B results.
- `suno-tracks.json`: one selected track per theme in the runtime catalog schema.
- `../generated/audio/suno-previews/`: ignored beginning-to-hook review excerpts.

Regenerate all derived files with:

```bash
pnpm import:suno
```

The importer verifies each MP3 with ffprobe, decodes a low-resolution mono analysis stream with FFmpeg, measures silence, peak, RMS, clipping, and structural lift, ranks each A/B pair, infers `excerptEndMs`, and creates previews. It never modifies the source MP3s or calls an external API.

Automatic structure detection is heuristic. Before using a track in a public recording, listen to its generated preview and override the selection or boundary if lyrics, pronunciation, or musical structure are unsuitable. Keep generation-time rights evidence with the batch record. Source masters remain ignored under `assets/` and are never published with the MIT-licensed code.
