import { expect, test } from "@playwright/test";

test("turns a listener message into a scheduled local broadcast", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Radio made for you/i })).toBeVisible();
  await page.getByLabel("Radio name").fill("Maya");
  await page
    .getByLabel("Your message")
    .fill("I finally moved to a new city and need a brave first-night song.");
  await page.getByRole("button", { name: "Create my show" }).click();

  const tuneIn = page.getByRole("button", { name: /Tune in|Join live broadcast/ });
  await expect(tuneIn).toBeVisible({ timeout: 25_000 });
  await tuneIn.click();
  await expect(page.getByText(/Receiver armed\. Keep this tab open\.|Live broadcast · pause/)).toBeVisible();
  await expect(page.getByText(/AI-generated host and voice/i)).toBeVisible();
  await page.screenshot({ path: "test-results/crowdfm-tuned-in.png", fullPage: true });

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("keeps the request line usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Radio made for you/i })).toBeVisible();
  await expect(page.getByLabel("Radio name")).toBeVisible();
  await expect(page.getByLabel("Your message")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create my show" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/crowdfm-mobile.png", fullPage: true });
});
