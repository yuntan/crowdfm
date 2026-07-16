export type RuntimeMode = "mock" | "openai";

export function getRuntimeHealth(
  environment: Record<string, string | undefined>,
): { mode: RuntimeMode; storage: "sqlite" } {
  return {
    mode: environment.CROWDFM_PROVIDER === "openai" ? "openai" : "mock",
    storage: "sqlite",
  };
}
