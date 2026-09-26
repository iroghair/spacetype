import { expect, test } from "@playwright/test";

test("game canvas loads and renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.locator("#game canvas")).toBeVisible();
  // Let the starfield drift a little before the screenshot.
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/play-scene.png" });

  expect(errors).toEqual([]);
});
