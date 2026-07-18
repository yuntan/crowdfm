import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { parseFile } from "music-metadata";

import { loadCatalog } from "@/lib/catalog";
import type { ListenerRequest, Track } from "@/lib/domain";
import { getOpenAIProductionProvider } from "@/lib/openai-provider";
import type { ProductionProvider, ShowPlan } from "@/lib/production";

const execFileAsync = promisify(execFile);

function delay(): Promise<void> {
  const configured = Number(process.env.CROWDFM_MOCK_DELAY_MS ?? 450);
  return new Promise((resolveDelay) =>
    setTimeout(resolveDelay, Number.isFinite(configured) ? configured : 450),
  );
}

export class MockProductionProvider implements ProductionProvider {
  readonly #catalog: Track[];

  constructor(catalog: Track[] = loadCatalog(process.env.CROWDFM_CATALOG_PATH)) {
    if (catalog.length === 0) throw new Error("The catalog needs at least one generated track.");
    this.#catalog = catalog;
  }

  async moderate(): Promise<{ flagged: boolean }> {
    await delay();
    return { flagged: false };
  }

  async plan(request: ListenerRequest): Promise<ShowPlan> {
    await delay();
    const track = this.#catalog[0] as Track;
    return {
      introScript: `${request.radioName}, welcome to CrowdFM. You shared: ${request.message} Tonight, this frequency belongs to your next chapter. Here is ${track.title}.`,
      outroScript: `${request.radioName}, keep that feeling with you. This was CrowdFM, made from your story.`,
      track,
    };
  }

  async synthesize(script: string, slot: "intro" | "outro") {
    await delay();
    const assetId = `mock-${slot}-${randomUUID()}`;
    const directory = resolve("generated/audio");
    const filePath = resolve(directory, `${assetId}.mp3`);
    const aiffPath = resolve(directory, `${assetId}.aiff`);
    await mkdir(directory, { recursive: true });

    try {
      await execFileAsync("say", ["-o", aiffPath, "--data-format=LEI16@48000", script]);
      await execFileAsync("ffmpeg", ["-y", "-i", aiffPath, "-codec:a", "libmp3lame", "-b:a", "128k", filePath]);
    } catch {
      const fallbackDuration = Math.max(2, Math.min(18, script.length / 14));
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${slot === "intro" ? 330 : 260}:duration=${fallbackDuration}`,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "128k",
        filePath,
      ]);
    } finally {
      await unlink(aiffPath).catch(() => undefined);
    }

    const metadata = await parseFile(filePath);
    if (!metadata.format.duration) throw new Error("Mock speech duration could not be measured");
    return {
      assetId,
      filePath,
      durationMs: Math.ceil(metadata.format.duration * 1_000),
    };
  }
}

declare global {
  var crowdFmMockProvider: MockProductionProvider | undefined;
}

export function getProductionProvider(): ProductionProvider {
  if (process.env.CROWDFM_PROVIDER === "openai") {
    return getOpenAIProductionProvider();
  }
  globalThis.crowdFmMockProvider ??= new MockProductionProvider();
  return globalThis.crowdFmMockProvider;
}
