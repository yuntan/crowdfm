import { expect, test } from "@playwright/test";

test("turns a listener message into a scheduled local broadcast", async ({ page }) => {
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
});
