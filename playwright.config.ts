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
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      CROWDFM_DATABASE_PATH: "/private/tmp/crowdfm-e2e.sqlite",
      CROWDFM_MOCK_DELAY_MS: "350",
    },
  },
});
