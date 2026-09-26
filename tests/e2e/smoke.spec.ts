import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const levelText = readFileSync("content/nl/test-level1.txt", "utf8").trim();
const shots = "test-results/screens";

// Open the game, wait until it is ready for keys, and start the level.
async function startLevel(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("overlay-start")).toBeVisible();
  await page.keyboard.press("Enter");
}

test("play level 1: correct keys score, a wrong key shows red with the typed key above", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.getByTestId("overlay-start")).toBeVisible();
  await page.screenshot({ path: `${shots}/1-start.png` });

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("overlay-start")).toBeHidden();
  await expect(page.getByTestId("score")).toHaveText("0");

  // Type the first 6 characters correctly.
  await page.keyboard.type(levelText.slice(0, 6), { delay: 80 });
  await expect(page.getByTestId("score")).toHaveText("60");

  // Then one wrong key for character 6.
  const expected = levelText[6];
  const wrongKey = expected === "k" ? "d" : "k";
  await page.keyboard.type(wrongKey);
  const wrongChar = page.locator('#panel .ch[data-index="6"]');
  await expect(wrongChar).toHaveClass(/wrong/);
  await expect(wrongChar.locator(".mark")).toHaveText(wrongKey);
  await expect(page.getByTestId("score")).toHaveText("60");

  // Let the stream move a bit so the play field shows letters and the arrow.
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/2-playing.png` });

  expect(errors).toEqual([]);
});

test("typing the whole level shows the level-complete box", async ({
  page,
}) => {
  await startLevel(page);
  await page.keyboard.type(levelText, { delay: 20 });
  await expect(page.getByTestId("overlay-complete")).toBeVisible();
  await expect(page.getByTestId("overlay-complete")).toContainText(
    String(levelText.length * 10),
  );
  await page.screenshot({ path: `${shots}/3-complete.png` });
});

test("backspace does nothing", async ({ page }) => {
  await startLevel(page);
  await page.keyboard.type(levelText.slice(0, 2), { delay: 50 });
  await page.keyboard.press("Backspace");
  await expect(page.locator('#panel .ch[data-index="1"]')).toHaveClass(
    /correct/,
  );
  await expect(page.getByTestId("score")).toHaveText("20");
});
