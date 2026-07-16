import { handleGetProgram } from "@/lib/program-api";
import { getProgramStore } from "@/lib/program-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  const { programId } = await context.params;
  return handleGetProgram(programId, getProgramStore());
}
