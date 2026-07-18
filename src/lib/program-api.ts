import { ZodError } from "zod";

import { RequestSchema, toDisplayStage } from "@/lib/domain";
import type { ProgramStore } from "@/lib/program-store";

interface CreateDependencies {
  store: ProgramStore;
  startProduction: (programId: string) => void;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function handleCreateProgram(
  request: Request,
  { store, startProduction }: CreateDependencies,
): Promise<Response> {
  try {
    const input = RequestSchema.parse(await request.json());
    const program = store.create(input);
    startProduction(program.id);
    return json(
      {
        programId: program.id,
        status: program.status,
        statusUrl: `/api/programs/${program.id}`,
      },
      202,
    );
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return json(
        {
          code: "VALIDATION_ERROR",
          message: "Enter a radio name and a message between 20 and 760 characters.",
        },
        422,
      );
    }
    return json(
      {
        code: "PRODUCTION_UNAVAILABLE",
        message: "The show could not be started. Please try again.",
      },
      503,
    );
  }
}

export function handleGetProgram(
  programId: string,
  store: ProgramStore,
  now: () => number = Date.now,
): Response {
  const program = store.get(programId);
  if (!program) {
    return json({ code: "PROGRAM_NOT_FOUND", message: "Program not found." }, 404);
  }

  const serverNow = now();
  let status = program.status;
  if (program.status === "READY" && program.startsAt !== null && program.timeline !== null) {
    if (serverNow >= program.startsAt + program.timeline.durationMs) {
      status = "ENDED";
    } else if (serverNow >= program.startsAt) {
      status = "ON_AIR";
    }
  }

  return json({ ...program, status, displayStage: toDisplayStage(status), serverNow }, 200);
}
