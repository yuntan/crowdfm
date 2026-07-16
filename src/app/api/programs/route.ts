import { handleCreateProgram } from "@/lib/program-api";
import { getProductionProvider } from "@/lib/mock-provider";
import { produceProgram } from "@/lib/production";
import { getProgramStore } from "@/lib/program-store";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const store = getProgramStore();
  return handleCreateProgram(request, {
    store,
    startProduction(programId) {
      void produceProgram(programId, { store, provider: getProductionProvider() });
    },
  });
}
