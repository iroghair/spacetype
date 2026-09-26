import { expect, test, type Page } from "@playwright/test";

const shots = "test-results/screens";

// From the level list: move to a level with the arrow keys, open its intro, start it.
// Returns the run's text (read from the dev-only hook).
async function startLevel(page: Page, moves: string[] = []): Promise<string> {
  await page.goto("/");
  await expect(page.getByTestId("screen-select")).toBeVisible();
  for (const key of moves) await page.keyboard.press(key);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("screen-intro")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("screen-intro")).toBeHidden();
  return page.evaluate(() => window.__spacetype!.text);
}

test("play level 1: correct keys score, a wrong key shows red with the typed key above", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.getByTestId("screen-select")).toBeVisible();
  await page.screenshot({ path: `${shots}/1-select.png` });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("screen-intro")).toBeVisible();
  await page.screenshot({ path: `${shots}/2-intro.png` });
  await page.keyboard.press("Enter");
  const text = await page.evaluate(() => window.__spacetype!.text);
  expect(text).toMatch(/^[fj ]+$/);

  await page.keyboard.type(text.slice(0, 6), { delay: 80 });
  await expect(page.getByTestId("score")).not.toHaveText("0");
  await expect(page.getByTestId("combo")).toHaveText("6");

  const wrongKey = text[6] === "k" ? "d" : "k";
  await page.keyboard.type(wrongKey);
  const wrongChar = page.locator('#panel .ch[data-index="6"]');
  await expect(wrongChar).toHaveClass(/wrong/);
  await expect(wrongChar.locator(".mark")).toHaveText(wrongKey);
  await expect(page.getByTestId("combo")).toHaveText("0");

  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/3-playing.png` });
  expect(errors).toEqual([]);
});

test("finishing a level shows results and saves the best on the level card", async ({
  page,
}) => {
  const text = await startLevel(page);
  await page.keyboard.type(text, { delay: 20 });
  await expect(page.getByTestId("screen-results")).toBeVisible();
  await expect(page.getByTestId("screen-results")).toContainText("100%");
  await page.screenshot({ path: `${shots}/4-results.png` });

  // "Next level" is highlighted; one step right is "Levels".
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("screen-select")).toBeVisible();
  await expect(page.getByTestId("level-1")).toContainText("★");
  await expect(page.getByTestId("level-1")).toContainText("Record");
  await page.screenshot({ path: `${shots}/5-select-after.png` });
});

test("a sentence level lists the confused keys on the results screen", async ({
  page,
}) => {
  // Level 15 is the last card: two rows down, four to the right.
  const text = await startLevel(page, [
    "ArrowDown",
    "ArrowDown",
    "ArrowRight",
    "ArrowRight",
    "ArrowRight",
    "ArrowRight",
  ]);
  expect(text).toMatch(/[A-Z]/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/6-sentences.png` });
  // Type everything, but press "q" instead of every "e".
  await page.keyboard.type(text.replaceAll("e", "q"), { delay: 10 });
  await expect(page.getByTestId("screen-results")).toBeVisible();
  await expect(page.getByTestId("confused-keys")).toContainText("e → q");
  await page.screenshot({ path: `${shots}/7-results-confused.png` });
});

test("Escape leaves a run and returns to the level list", async ({ page }) => {
  await startLevel(page);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("screen-select")).toBeVisible();
});

test("backspace does nothing", async ({ page }) => {
  const text = await startLevel(page);
  await page.keyboard.type(text.slice(0, 2), { delay: 50 });
  await page.keyboard.press("Backspace");
  await expect(page.locator('#panel .ch[data-index="1"]')).toHaveClass(
    /correct/,
  );
  await expect(page.getByTestId("combo")).toHaveText("2");
});
