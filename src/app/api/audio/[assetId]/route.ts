import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AssetIdPattern = /^[a-zA-Z0-9-]{1,80}$/;

export function isValidAssetId(assetId: string): boolean {
  return AssetIdPattern.test(assetId);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const { assetId } = await context.params;
  if (!isValidAssetId(assetId)) {
    return Response.json({ code: "AUDIO_NOT_FOUND", message: "Audio not found." }, { status: 404 });
  }
  try {
    const audio = await readFile(resolve("generated/audio", `${assetId}.mp3`));
    return new Response(audio, {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json({ code: "AUDIO_NOT_FOUND", message: "Audio not found." }, { status: 404 });
  }
}
