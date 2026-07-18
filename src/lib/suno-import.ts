export interface SunoCandidate {
  id: string;
  title: string;
  sourceUrl: string;
}

export interface SunoTheme {
  index: number;
  name: string;
  description: string;
  instrumental: boolean;
  generatedAt: string;
  prompt: string;
  candidates: SunoCandidate[];
}

export interface SunoBatch {
  model: string;
  planAtGeneration: string;
  themes: SunoTheme[];
}

export interface AudioAnalysis {
  durationMs: number;
  sampleRate: number;
  meanRmsDb: number;
  peakDb: number;
  clippingRatio: number;
  silenceRatio: number;
  leadingSilenceMs: number;
  hookStartMs: number;
  excerptEndMs: number;
  hookConfidence: number;
  structuralLiftDb: number;
}

export interface CandidateAnalysis {
  id: string;
  analysis: AudioAnalysis;
}

export interface RankedCandidate extends CandidateAnalysis {
  selectionScore: number;
}

export interface SunoCatalogTrack {
  id: string;
  title: string;
  displayArtist: string;
  audioPath: string;
  durationMs: number;
  excerptStartMs: 0;
  excerptEndMs: number;
  tags: string[];
  mood: string[];
  hasVocals: boolean;
  editorialNotes: string[];
  provenance: {
    provider: "SUNO";
    songId: string;
    sourceUrl: string;
    generatedAt: string;
    generationPrompt: string;
    model: string;
    planAtGeneration: string;
    rightsEvidencePath: string;
  };
  verifiedFacts: Array<{ text: string; sourceUrl: string }>;
}

export interface SunoImportReport {
  algorithmVersion: "1";
  themes: Array<{
    theme: string;
    selectedSongId: string;
    excerptEndMs: number;
    candidates: Array<{
      songId: string;
      title: string;
      selected: boolean;
      selectionScore: number;
      analysis: AudioAnalysis;
    }>;
  }>;
}

function requiredLine(markdown: string, label: string): string {
  const match = markdown.match(new RegExp(`^- ${label}: (.+)$`, "m"));
  if (!match) throw new Error(`Missing ${label} in Suno generation record`);
  return match[1].trim();
}

function stripCandidateSuffix(title: string): string {
  return title.replace(/\s+[—-]\s+candidate\s+[A-Z]$/i, "").trim();
}

export function parseSunoBatch(markdown: string): SunoBatch {
  const sectionPattern = /^## (\d+)\. (.+)$/gm;
  const sectionMatches = [...markdown.matchAll(sectionPattern)];

  const themes = sectionMatches.map((match, matchIndex): SunoTheme => {
    const start = (match.index ?? 0) + match[0].length;
    const end = sectionMatches[matchIndex + 1]?.index ?? markdown.length;
    const section = markdown.slice(start, end);
    const generatedAt = requiredLine(section, "Generated at").match(/^\S+/)?.[0];
    if (!generatedAt) throw new Error(`Invalid Generated at for ${match[2]}`);

    const candidates = [...section.matchAll(/\[([^\]]+)\]\((https:\/\/suno\.com\/song\/([^\s)]+))\)/g)].map(
      (candidate): SunoCandidate => ({
        id: candidate[3],
        title: stripCandidateSuffix(candidate[1]),
        sourceUrl: candidate[2],
      }),
    );
    if (candidates.length === 0) throw new Error(`No candidates found for ${match[2]}`);

    const promptSection = section.split("- Prompt:")[1] ?? "";
    const prompt = promptSection
      .split("\n")
      .filter((line) => line.startsWith(">"))
      .map((line) => line.replace(/^>\s?/, "").trim())
      .join(" ")
      .trim();
    if (!prompt) throw new Error(`No prompt found for ${match[2]}`);

    return {
      index: Number(match[1]),
      name: match[2].trim(),
      description: requiredLine(section, "Theme"),
      instrumental: requiredLine(section, "Instrumental") === "Yes",
      generatedAt,
      prompt,
      candidates,
    };
  });

  return {
    model: requiredLine(markdown, "Model"),
    planAtGeneration: requiredLine(markdown, "Plan at generation"),
    themes,
  };
}

function toDb(amplitude: number): number {
  return amplitude > 0 ? 20 * Math.log10(amplitude) : -120;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function analyzePcm16le(pcm: Buffer, sampleRate: number): AudioAnalysis {
  if (sampleRate <= 0 || pcm.length < 2 || pcm.length % 2 !== 0) {
    throw new Error("PCM input must contain signed 16-bit samples with a positive sample rate");
  }

  const sampleCount = pcm.length / 2;
  const windowSamples = sampleRate;
  const windowRmsDb: number[] = [];
  let totalSquares = 0;
  let absolutePeak = 0;
  let clippingSamples = 0;

  for (let windowStart = 0; windowStart < sampleCount; windowStart += windowSamples) {
    const windowEnd = Math.min(windowStart + windowSamples, sampleCount);
    let windowSquares = 0;

    for (let sampleIndex = windowStart; sampleIndex < windowEnd; sampleIndex += 1) {
      const sample = pcm.readInt16LE(sampleIndex * 2) / 32_768;
      const absolute = Math.abs(sample);
      const square = sample * sample;
      windowSquares += square;
      totalSquares += square;
      absolutePeak = Math.max(absolutePeak, absolute);
      if (absolute >= 0.999) clippingSamples += 1;
    }

    windowRmsDb.push(toDb(Math.sqrt(windowSquares / (windowEnd - windowStart))));
  }

  const silenceThresholdDb = -45;
  const leadingSilentWindows = windowRmsDb.findIndex((value) => value >= silenceThresholdDb);
  const searchEnd = Math.min(50, windowRmsDb.length - 6);
  let hookWindow = Math.min(35, Math.max(0, windowRmsDb.length - 1));
  let strongestLiftDb = 0;
  let bestHookScore = 0;

  for (let index = 15; index <= searchEnd; index += 1) {
    const before = mean(windowRmsDb.slice(Math.max(0, index - 6), index));
    const after = mean(windowRmsDb.slice(index, index + 6));
    const liftDb = after - before;
    const hookScore = liftDb - Math.max(0, index - 35) * 0.5;
    if (hookScore > bestHookScore) {
      bestHookScore = hookScore;
      strongestLiftDb = liftDb;
      hookWindow = index;
    }
  }

  const durationMs = Math.round((sampleCount / sampleRate) * 1_000);
  const hookStartMs = Math.min(hookWindow * 1_000, durationMs);

  return {
    durationMs,
    sampleRate,
    meanRmsDb: round(toDb(Math.sqrt(totalSquares / sampleCount))),
    peakDb: round(toDb(absolutePeak)),
    clippingRatio: round(clippingSamples / sampleCount, 6),
    silenceRatio: round(
      windowRmsDb.filter((value) => value < silenceThresholdDb).length / windowRmsDb.length,
      6,
    ),
    leadingSilenceMs: (leadingSilentWindows < 0 ? windowRmsDb.length : leadingSilentWindows) * 1_000,
    hookStartMs,
    excerptEndMs: Math.min(durationMs, Math.max(30_000, hookStartMs + 12_000)),
    hookConfidence: round(Math.max(0, Math.min(1, (strongestLiftDb - 2) / 10))),
    structuralLiftDb: round(strongestLiftDb),
  };
}

function selectionScore(analysis: AudioAnalysis): number {
  const earlyHookScore = Math.max(0, 20 - Math.abs(analysis.hookStartMs - 35_000) / 2_000);
  const loudnessScore = Math.max(0, 10 - Math.abs(analysis.meanRmsDb + 16));
  const durationScore = analysis.durationMs >= 60_000 ? 5 : 0;
  const silencePenalty = analysis.silenceRatio * 50 + (analysis.leadingSilenceMs / 1_000) * 1.5;
  const clippingPenalty = analysis.clippingRatio * 5_000 + (analysis.peakDb > -0.1 ? 4 : 0);

  return round(
    analysis.hookConfidence * 60 +
      earlyHookScore +
      loudnessScore +
      durationScore -
      silencePenalty -
      clippingPenalty,
  );
}

export function rankCandidates(candidates: CandidateAnalysis[]): RankedCandidate[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      selectionScore: selectionScore(candidate.analysis),
    }))
    .sort(
      (left, right) =>
        right.selectionScore - left.selectionScore || left.id.localeCompare(right.id),
    );
}

const MOOD_TERMS = [
  "bittersweet",
  "calm",
  "comforting",
  "determined",
  "energetic",
  "focused",
  "grateful",
  "hopeful",
  "joyful",
  "melancholic",
  "nostalgic",
  "reflective",
  "soulful",
  "uplifting",
  "warm",
];

const GENRE_TERMS = [
  "acoustic",
  "alternative-pop",
  "ambient",
  "chamber",
  "disco",
  "downtempo",
  "electronic-rock",
  "folk-pop",
  "funk-pop",
  "jazzhop",
  "lo-fi",
  "neo-soul",
  "r&b",
  "synthwave",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function termsIn(text: string, terms: string[]): string[] {
  const normalized = text.toLowerCase().replace(/[–—]/g, "-");
  return terms.filter((term) => {
    const pattern = term
      .split("-")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[\\s-]+");
    return new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`).test(normalized);
  });
}

export function buildSunoCatalog(
  batch: SunoBatch,
  analyses: CandidateAnalysis[],
  options: { assetDirectory: string; rightsEvidencePath: string },
): { catalog: SunoCatalogTrack[]; report: SunoImportReport } {
  const analysisById = new Map(analyses.map((candidate) => [candidate.id, candidate.analysis]));
  const catalog: SunoCatalogTrack[] = [];
  const report: SunoImportReport = { algorithmVersion: "1", themes: [] };

  for (const theme of batch.themes) {
    const ranked = rankCandidates(
      theme.candidates.map((candidate) => {
        const analysis = analysisById.get(candidate.id);
        if (!analysis) throw new Error(`Missing audio analysis for ${candidate.id}`);
        return { id: candidate.id, analysis };
      }),
    );
    const selected = ranked[0];
    const candidate = theme.candidates.find((item) => item.id === selected.id);
    if (!candidate) throw new Error(`Missing candidate metadata for ${selected.id}`);
    const descriptorText = `${theme.name} ${theme.description} ${theme.prompt}`;

    catalog.push({
      id: slugify(theme.name),
      title: candidate.title,
      displayArtist: "CrowdFM Original",
      audioPath: `${options.assetDirectory}/${candidate.id}.mp3`,
      durationMs: selected.analysis.durationMs,
      excerptStartMs: 0,
      excerptEndMs: selected.analysis.excerptEndMs,
      tags: [theme.instrumental ? "instrumental" : "vocal", ...termsIn(descriptorText, GENRE_TERMS)],
      mood: termsIn(descriptorText, MOOD_TERMS),
      hasVocals: !theme.instrumental,
      editorialNotes: [
        theme.description,
        `Automatically selected from ${ranked.length} candidates with score ${selected.selectionScore}.`,
      ],
      provenance: {
        provider: "SUNO",
        songId: candidate.id,
        sourceUrl: candidate.sourceUrl,
        generatedAt: theme.generatedAt,
        generationPrompt: theme.prompt,
        model: batch.model,
        planAtGeneration: batch.planAtGeneration,
        rightsEvidencePath: options.rightsEvidencePath,
      },
      verifiedFacts: [],
    });
    report.themes.push({
      theme: theme.name,
      selectedSongId: candidate.id,
      excerptEndMs: selected.analysis.excerptEndMs,
      candidates: ranked.map((item) => ({
        songId: item.id,
        title: theme.candidates.find((candidateItem) => candidateItem.id === item.id)?.title ?? item.id,
        selected: item.id === selected.id,
        selectionScore: item.selectionScore,
        analysis: item.analysis,
      })),
    });
  }

  return { catalog, report };
}
