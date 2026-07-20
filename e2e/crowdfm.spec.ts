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
  await expect(page).toHaveURL(/\?program=[a-zA-Z0-9-]+/);

  const tuneIn = page.getByRole("button", { name: /Tune in|Join live broadcast/ });
  await expect(tuneIn).toBeVisible({ timeout: 25_000 });
  await tuneIn.click();
  await expect(page.getByText(/Receiver armed\. The show will start automatically\.|Live broadcast · pause/)).toBeVisible();
  await expect(page.locator(".broadcast-status .on-air")).toHaveText("ON AIR", { timeout: 20_000 });
  await expect(page.locator(".host-speaking").getByText(/AI-generated host and voice/i)).toBeVisible();

  const audio = page.locator("audio.program-audio");
  await expect(audio).not.toHaveAttribute("controls", "");
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  const elapsedBeforeReload = await audio.evaluate((element: HTMLAudioElement) => element.currentTime);
  await expect(page.getByRole("button", { name: /pause|seek|replay|skip/i })).toHaveCount(0);

  await page.reload();
  await expect(page.locator(".broadcast-status .on-air")).toHaveText("ON AIR", { timeout: 10_000 });
  const rejoin = page.getByRole("button", { name: "Join live broadcast" });
  if (await rejoin.isVisible()) await rejoin.click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime), { timeout: 10_000 }).toBeGreaterThan(elapsedBeforeReload);
  await page.screenshot({ path: "test-results/crowdfm-tuned-in.png", fullPage: true });

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("keeps the request line usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Radio made for you/i })).toBeVisible();
  await expect(page.getByLabel("Radio name")).toBeVisible();
  const message = page.getByLabel("Your message");
  await expect(message).toBeVisible();
  await expect(message).not.toHaveValue("");
  const exampleLength = (await message.inputValue()).length;
  await expect(page.getByText(`${exampleLength} / 760`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create my show" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/crowdfm-mobile.png", fullPage: true });
});
