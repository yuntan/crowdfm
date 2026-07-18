import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleCreateProgram, handleGetProgram } from "@/lib/program-api";
import { ProgramStore } from "@/lib/program-store";

describe("program API handlers", () => {
  let store: ProgramStore;

  beforeEach(() => {
    store = new ProgramStore(":memory:", () => 1_721_101_200_000, () => "program-1");
  });

  afterEach(() => {
    store.close();
  });

  it("creates a queued program and starts production", async () => {
    const startProduction = vi.fn();
    const response = await handleCreateProgram(
      new Request("http://localhost/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          radioName: "Maya",
          message: "I finally moved to a new city and need a brave first-night song.",
        }),
      }),
      { store, startProduction },
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      programId: "program-1",
      status: "QUEUED",
      statusUrl: "/api/programs/program-1",
    });
    expect(startProduction).toHaveBeenCalledWith("program-1");
  });

  it("returns a stable 422 response for malformed input", async () => {
    const response = await handleCreateProgram(
      new Request("http://localhost/api/programs", {
        method: "POST",
        body: JSON.stringify({ radioName: "", message: "short" }),
      }),
      { store, startProduction: vi.fn() },
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("returns server time with the current program", async () => {
    store.create({
      radioName: "Maya",
      message: "I finally moved to a new city and need a brave first-night song.",
    });

    const response = handleGetProgram("program-1", store, () => 1_721_101_201_000);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: "program-1",
      status: "QUEUED",
      displayStage: "CHECKING_REQUEST",
      serverNow: 1_721_101_201_000,
    });
  });

  it("derives ON_AIR and ENDED from server time without changing the shared timeline", async () => {
    store.create({
      radioName: "Maya",
      message: "I finally moved to a new city and need a brave first-night song.",
    });
    const readyAt = 1_721_101_200_000;
    store.transition("program-1", "QUEUED", "READY", {
      readyAt,
      startsAt: readyAt + 15_000,
      timeline: {
        audioUrl: "/api/audio/program-1",
        durationMs: 3_000,
        isAiVoice: true,
        cues: [
          { type: "HOST", startsAtMs: 0, durationMs: 1_000, transcript: "Welcome." },
          { type: "MUSIC", startsAtMs: 1_000, durationMs: 1_000, trackId: "one", title: "One", displayArtist: "CrowdFM Original" },
          { type: "HOST", startsAtMs: 2_000, durationMs: 1_000, transcript: "Good night." },
        ],
      },
    });

    const live = await handleGetProgram("program-1", store, () => readyAt + 16_000).json();
    const ended = await handleGetProgram("program-1", store, () => readyAt + 18_000).json();

    expect(live).toMatchObject({ status: "ON_AIR", displayStage: "ON_AIR" });
    expect(ended).toMatchObject({ status: "ENDED", displayStage: "ENDED" });
  });

  it("returns 404 without leaking storage details", async () => {
    const response = handleGetProgram("missing", store);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "PROGRAM_NOT_FOUND", message: "Program not found." });
  });
});
