import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { parseFile } from "music-metadata";

import type { Track } from "@/lib/domain";

const execFileAsync = promisify(execFile);
const FADE_DURATION_SECONDS = 0.75;

export interface SpeechAsset {
  assetId: string;
  filePath: string;
  durationMs: number;
}

export interface FinalProgramAsset extends SpeechAsset {
  audioUrl: string;
}

export interface AssemblyInput {
  intro: SpeechAsset;
  track: Track;
  outro: SpeechAsset;
}

export interface ProgramAssembler {
  assemble(input: AssemblyInput): Promise<FinalProgramAsset>;
}

export function buildFfmpegAssemblyArgs(input: {
  introPath: string;
  musicPath: string;
  outroPath: string;
  excerptEndMs: number;
  outputPath: string;
}): string[] {
  const excerptEndSeconds = input.excerptEndMs / 1_000;
  const fadeStartSeconds = Math.max(0, excerptEndSeconds - FADE_DURATION_SECONDS);
  const normalize = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
  const filters = [
    `[0:a]${normalize}[intro]`,
    `[1:a]atrim=start=0:end=${excerptEndSeconds},asetpts=PTS-STARTPTS,${normalize},afade=t=out:st=${fadeStartSeconds}:d=${FADE_DURATION_SECONDS}[music]`,
    `[2:a]${normalize}[outro]`,
    "[intro][music][outro]concat=n=3:v=0:a=1[program]",
  ].join(";");

  return [
    "-y",
    "-i",
    input.introPath,
    "-i",
    input.musicPath,
    "-i",
    input.outroPath,
    "-filter_complex",
    filters,
    "-map",
    "[program]",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    input.outputPath,
  ];
}

export class FfmpegProgramAssembler implements ProgramAssembler {
  readonly #createId: () => string;
  readonly #run: (args: string[]) => Promise<void>;
  readonly #measureDuration: (filePath: string) => Promise<number>;

  constructor(options: {
    createId?: () => string;
    run?: (args: string[]) => Promise<void>;
    measureDuration?: (filePath: string) => Promise<number>;
  } = {}) {
    this.#createId = options.createId ?? randomUUID;
    this.#run = options.run ?? (async (args) => {
      await execFileAsync("ffmpeg", args);
    });
    this.#measureDuration = options.measureDuration ?? (async (filePath) => {
      const metadata = await parseFile(filePath);
      if (!metadata.format.duration) throw new Error("Final program duration could not be measured");
      return Math.ceil(metadata.format.duration * 1_000);
    });
  }

  async assemble({ intro, track, outro }: AssemblyInput): Promise<FinalProgramAsset> {
    const assetId = this.#createId();
    const outputDirectory = resolve("generated/audio");
    const outputPath = resolve(outputDirectory, `${assetId}.mp3`);
    await mkdir(outputDirectory, { recursive: true });
    await this.#run(buildFfmpegAssemblyArgs({
      introPath: resolve(intro.filePath),
      musicPath: resolve(track.audioPath),
      outroPath: resolve(outro.filePath),
      excerptEndMs: track.excerptEndMs,
      outputPath,
    }));
    return {
      assetId,
      audioUrl: `/api/audio/${assetId}`,
      filePath: outputPath,
      durationMs: await this.#measureDuration(outputPath),
    };
  }
}

let programAssembler: FfmpegProgramAssembler | undefined;

export function getProgramAssembler(): ProgramAssembler {
  programAssembler ??= new FfmpegProgramAssembler();
  return programAssembler;
}
