# Curated track catalog

`tracks.json` is the legacy YouTube catalog consumed by the current application. It stays empty while the application is migrated to the generated-audio contract; mock mode remains usable.

The Suno preparation workflow uses:

- `suno-generation-2026-07-17.md`: prompts, source URLs, model, and generation-time plan.
- `../assets/<Suno song ID>.mp3`: the 20 local candidate masters.
- `suno-analysis.json`: reproducible measurements and ranked A/B results.
- `suno-tracks.json`: one automatically selected track per theme in the next catalog schema.
- `../generated/audio/suno-previews/`: ignored beginning-to-hook review excerpts.

Regenerate all derived files with:

```bash
pnpm import:suno
```

The importer verifies each MP3 with ffprobe, decodes a low-resolution mono analysis stream with FFmpeg, measures silence, peak, RMS, clipping, and structural lift, ranks each A/B pair, infers `excerptEndMs`, and creates previews. It never modifies the source MP3s or calls an external API.

Automatic structure detection is heuristic. Before the final submission recording, listen to the ten generated previews and override a selected song or boundary if lyrics, pronunciation, or musical structure are unsuitable. Keep generation-time rights evidence with the batch record.
