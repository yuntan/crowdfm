import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

import {
  analyzePcm16le,
  buildSunoCatalog,
  parseSunoBatch,
  type AudioAnalysis,
} from "../src/lib/suno-import.ts";

interface SourceProbe {
  codecName: string;
  sampleRate: number;
  channels: number;
  bitRate: number | null;
  durationMs: number;
  sizeBytes: number;
}

interface CliOptions {
  recordPath: string;
  assetDirectory: string;
  catalogPath: string;
  reportPath: string;
  previewDirectory: string;
}

const root = process.cwd();

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0) return resolve(root, fallback);
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a path`);
  return resolve(root, value);
}

const options: CliOptions = {
  recordPath: option("--record", "data/suno-generation-2026-07-17.md"),
  assetDirectory: option("--assets", "assets"),
  catalogPath: option("--catalog", "data/suno-tracks.json"),
  reportPath: option("--report", "data/suno-analysis.json"),
  previewDirectory: option("--previews", "generated/audio/suno-previews"),
};

function runText(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

function decodePcm(filePath: string): Buffer {
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", filePath, "-map", "0:a:0", "-ac", "1", "-ar", "8000", "-f", "s16le", "pipe:1"],
    { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${basename(filePath)}: ${result.stderr.toString().trim()}`);
  }
  return result.stdout;
}

function probe(filePath: string): SourceProbe {
  const output = runText("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name,sample_rate,channels,bit_rate:format=duration,size,bit_rate",
    "-of",
    "json",
    filePath,
  ]);
  const parsed = JSON.parse(output) as {
    streams?: Array<Record<string, string | number>>;
    format?: Record<string, string | number>;
  };
  const stream = parsed.streams?.[0];
  const format = parsed.format;
  if (!stream || !format) throw new Error(`No audio stream found in ${basename(filePath)}`);

  return {
    codecName: String(stream.codec_name),
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    bitRate: Number(stream.bit_rate ?? format.bit_rate) || null,
    durationMs: Math.round(Number(format.duration) * 1_000),
    sizeBytes: Number(format.size),
  };
}

function createPreview(inputPath: string, outputPath: string, excerptEndMs: number): void {
  const durationSeconds = excerptEndMs / 1_000;
  const fadeStart = Math.max(0, durationSeconds - 1.5);
  runText("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    inputPath,
    "-t",
    String(durationSeconds),
    "-af",
    `afade=t=out:st=${fadeStart}:d=1.5`,
    "-ar",
    "48000",
    "-ac",
    "2",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

function relativePath(path: string): string {
  return relative(root, path).replaceAll("\\", "/");
}

function main(): void {
  runText("ffmpeg", ["-version"]);
  runText("ffprobe", ["-version"]);

  const batch = parseSunoBatch(readFileSync(options.recordPath, "utf8"));
  const sourceDetails: Record<string, SourceProbe> = {};
  const analyses: Array<{ id: string; analysis: AudioAnalysis }> = [];

  for (const theme of batch.themes) {
    for (const candidate of theme.candidates) {
      const filePath = join(options.assetDirectory, `${candidate.id}.mp3`);
      process.stdout.write(`Analyzing ${theme.name}: ${candidate.title} (${candidate.id})\n`);
      sourceDetails[candidate.id] = probe(filePath);
      analyses.push({ id: candidate.id, analysis: analyzePcm16le(decodePcm(filePath), 8_000) });
    }
  }

  const { catalog, report } = buildSunoCatalog(batch, analyses, {
    assetDirectory: relativePath(options.assetDirectory),
    rightsEvidencePath: relativePath(options.recordPath),
  });

  mkdirSync(dirname(options.catalogPath), { recursive: true });
  mkdirSync(dirname(options.reportPath), { recursive: true });
  mkdirSync(options.previewDirectory, { recursive: true });
  writeFileSync(options.catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeFileSync(
    options.reportPath,
    `${JSON.stringify(
      {
        algorithmVersion: report.algorithmVersion,
        generatedAt: new Date().toISOString(),
        recordPath: relativePath(options.recordPath),
        assetDirectory: relativePath(options.assetDirectory),
        sourceDetails,
        themes: report.themes,
      },
      null,
      2,
    )}\n`,
  );

  for (const track of catalog) {
    createPreview(
      resolve(root, track.audioPath),
      join(options.previewDirectory, `${track.id}.mp3`),
      track.excerptEndMs,
    );
    process.stdout.write(`Selected ${track.id}: ${track.title} through ${(track.excerptEndMs / 1_000).toFixed(1)}s\n`);
  }

  process.stdout.write(`Catalog: ${relativePath(options.catalogPath)}\n`);
  process.stdout.write(`Analysis: ${relativePath(options.reportPath)}\n`);
  process.stdout.write(`Previews: ${relativePath(options.previewDirectory)}\n`);
}

main();
