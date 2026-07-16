import { readFileSync } from "node:fs";

import { z } from "zod";

import { TrackSchema, type Track } from "@/lib/domain";

const CatalogSchema = z.array(TrackSchema).min(1, "The catalog needs at least one licensed track.");

export function parseCatalog(input: unknown): Track[] {
  return CatalogSchema.parse(input);
}

export function loadCatalog(filename = "data/tracks.json"): Track[] {
  return parseCatalog(JSON.parse(readFileSync(filename, "utf8")));
}
