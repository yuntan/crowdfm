import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  projects: [
    {
      name: "chrome",
      use: { channel: "chrome" },
    },
  ],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm start --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CROWDFM_DATABASE_PATH: "/private/tmp/crowdfm-e2e-v2.sqlite",
      CROWDFM_PROVIDER: "mock",
      CROWDFM_CATALOG_PATH: "data/suno-tracks.json",
      CROWDFM_MOCK_DELAY_MS: "350",
    },
  },
});
