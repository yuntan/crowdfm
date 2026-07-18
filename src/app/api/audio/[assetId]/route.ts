import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AssetIdPattern = /^[a-zA-Z0-9-]{1,80}$/;

export function isValidAssetId(assetId: string): boolean {
  return AssetIdPattern.test(assetId);
}

export function parseByteRange(
  value: string,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || size <= 0) return null;
  const [, startText, endText] = match;
  if (!startText && !endText) return null;

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(startText);
  const requestedEnd = endText ? Number(endText) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(requestedEnd) || start >= size || requestedEnd < start) {
    return null;
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const { assetId } = await context.params;
  if (!isValidAssetId(assetId)) {
    return Response.json({ code: "AUDIO_NOT_FOUND", message: "Audio not found." }, { status: 404 });
  }
  try {
    const audio = await readFile(resolve("generated/audio", `${assetId}.mp3`));
    const rangeHeader = request.headers.get("range");
    const commonHeaders = {
      "accept-ranges": "bytes",
      "content-type": "audio/mpeg",
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    };
    if (rangeHeader) {
      const range = parseByteRange(rangeHeader, audio.byteLength);
      if (!range) {
        return new Response(null, {
          status: 416,
          headers: { ...commonHeaders, "content-range": `bytes */${audio.byteLength}` },
        });
      }
      const chunk = audio.subarray(range.start, range.end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          ...commonHeaders,
          "content-length": String(chunk.byteLength),
          "content-range": `bytes ${range.start}-${range.end}/${audio.byteLength}`,
        },
      });
    }
    return new Response(audio, {
      headers: {
        ...commonHeaders,
        "content-length": String(audio.byteLength),
      },
    });
  } catch {
    return Response.json({ code: "AUDIO_NOT_FOUND", message: "Audio not found." }, { status: 404 });
  }
}
