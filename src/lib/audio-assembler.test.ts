import { describe, expect, it } from "vitest";

import { buildFfmpegAssemblyArgs } from "@/lib/audio-assembler";

describe("buildFfmpegAssemblyArgs", () => {
  it("normalizes, trims, fades, and concatenates HOST → MUSIC → HOST into one MP3", () => {
    const args = buildFfmpegAssemblyArgs({
      introPath: "generated/audio/intro.mp3",
      musicPath: "assets/song.mp3",
      outroPath: "generated/audio/outro.mp3",
      excerptEndMs: 30_000,
      outputPath: "generated/audio/program.mp3",
    });

    expect(args.filter((argument) => argument === "-i")).toHaveLength(3);
    expect(args).toEqual(expect.arrayContaining([
      "generated/audio/intro.mp3",
      "assets/song.mp3",
      "generated/audio/outro.mp3",
      "-filter_complex",
      "-map",
      "[program]",
      "generated/audio/program.mp3",
    ]));
    const filters = args[args.indexOf("-filter_complex") + 1];
    expect(filters).toContain("atrim=start=0:end=30");
    expect(filters).toContain("afade=t=out:st=29.25:d=0.75");
    expect(filters).toContain("concat=n=3:v=0:a=1[program]");
  });
});
