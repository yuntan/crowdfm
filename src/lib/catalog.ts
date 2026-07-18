import { readFileSync } from "node:fs";

import { z } from "zod";

import { TrackSchema, type Track } from "@/lib/domain";

const CatalogSchema = z
  .array(TrackSchema)
  .min(1, "The catalog needs at least one rights-verified track.");

export function parseCatalog(input: unknown): Track[] {
  return CatalogSchema.parse(input);
}

export function loadCatalog(filename = "data/suno-tracks.json"): Track[] {
  return parseCatalog(JSON.parse(readFileSync(filename, "utf8")));
}
