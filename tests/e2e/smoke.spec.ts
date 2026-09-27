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

// ---------- Finger guide ----------

const LEFT_HAND = "qwertasdfgzxcvb";

// Sorted, because the page lists keys in on-screen order.
async function litKeys(page: Page): Promise<string[]> {
  return page
    .locator("#guide .key.next")
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.key!).sort(),
    );
}

async function litFingers(page: Page): Promise<string[]> {
  return page
    .locator("#guide .finger.active")
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.finger!).sort(),
    );
}

test("the finger guide follows the next letter and space in level 1", async ({
  page,
}) => {
  const text = await startLevel(page);
  for (let i = 0; i < 6; i++) {
    const c = text[i];
    const expected = c === " " ? ["Space"] : [c === "f" ? "KeyF" : "KeyJ"];
    const fingers =
      c === " " ? ["L-thumb", "R-thumb"] : [c === "f" ? "L-index" : "R-index"];
    await expect.poll(() => litKeys(page)).toEqual(expected);
    await expect.poll(() => litFingers(page)).toEqual(fingers);
    if (i === 0) await page.screenshot({ path: `${shots}/8-guide-level1.png` });
    await page.keyboard.type(c);
  }
});

test("capitals light up the key and the opposite-hand Shift (level 12)", async ({
  page,
}) => {
  // Level 12 is the second card on the bottom row.
  const text = await startLevel(page, ["ArrowDown", "ArrowDown", "ArrowRight"]);
  const i = text.search(/[A-Z]/);
  await page.keyboard.type(text.slice(0, i), { delay: 10 });
  const capital = text[i];
  const left = LEFT_HAND.includes(capital.toLowerCase());
  await expect
    .poll(() => litKeys(page))
    .toEqual([`Key${capital}`, left ? "ShiftRight" : "ShiftLeft"].sort());
  expect(await litFingers(page)).toContain(left ? "R-pinky" : "L-pinky");
  await page.screenshot({ path: `${shots}/9-guide-capital.png` });
});

test("punctuation lights up the right key (level 13)", async ({ page }) => {
  const text = await startLevel(page, [
    "ArrowDown",
    "ArrowDown",
    "ArrowRight",
    "ArrowRight",
  ]);
  const i = text.search(/[?!:]/);
  await page.keyboard.type(text.slice(0, i), { delay: 10 });
  const expected = {
    "?": ["Slash", "ShiftLeft"],
    "!": ["Digit1", "ShiftRight"],
    ":": ["Semicolon", "ShiftLeft"],
  }[text[i] as "?" | "!" | ":"];
  await expect.poll(() => litKeys(page)).toEqual([...expected].sort());
  await page.screenshot({ path: `${shots}/10-guide-punctuation.png` });
});

test("the finger guide can be switched off, and stays off after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("screen-select")).toBeVisible();
  // Down three rows from level 1 reaches the switch below the grid.
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("setting-fingerGuide")).toContainText("uit");
  await expect(page.locator("#guide")).toHaveCSS("visibility", "hidden");
  await page.screenshot({ path: `${shots}/11-guide-off.png` });
  await page.reload();
  await expect(page.getByTestId("setting-fingerGuide")).toContainText("uit");
  await expect(page.locator("#guide")).toHaveCSS("visibility", "hidden");
});

// ---------- Effects & sound (phase 5) ----------

test("typing fast for a while turns on turbo, with a badge in the HUD", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  // Level 3: 100 characters. At one key per 130 ms (~460 SPM) turbo starts after 10 s.
  const text = await startLevel(page, ["ArrowRight", "ArrowRight"]);
  await page.keyboard.type(text.slice(0, 20), { delay: 130 });
  await page.screenshot({ path: `${shots}/12-tier-popup.png` });
  await page.keyboard.type(text.slice(20, 85), { delay: 130 });
  await expect(page.getByTestId("turbo")).toBeVisible();
  await page.screenshot({ path: `${shots}/13-turbo.png` });
  await page.keyboard.type(text.slice(85), { delay: 20 });
  await expect(page.getByTestId("screen-results")).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${shots}/14-results-fireworks.png` });
  expect(errors).toEqual([]);
});

test("beating a score shows the record banner", async ({ page }) => {
  // First run: slow and sloppy. Second run: perfect. The second is a record.
  let text = await startLevel(page);
  await page.keyboard.type(text.replaceAll("f", "k"), { delay: 10 });
  await expect(page.getByTestId("screen-results")).toBeVisible();
  await page.keyboard.press("ArrowLeft"); // "Again"
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("screen-intro")).toBeVisible();
  await page.keyboard.press("Enter");
  text = await page.evaluate(() => window.__spacetype!.text);
  await page.keyboard.type(text, { delay: 10 });
  await expect(page.getByTestId("screen-results")).toContainText(
    "Nieuw record!",
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/15-record.png` });
});

test("sound, volume and music buttons change and are remembered", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("setting-sound")).toContainText("aan");
  await expect(page.getByTestId("setting-music")).toContainText("uit");
  await page.getByTestId("setting-sound").click();
  await page.getByTestId("setting-volume").click();
  await page.getByTestId("setting-music").click();
  await expect(page.getByTestId("setting-sound")).toContainText("uit");
  await expect(page.getByTestId("setting-volume")).toContainText("75%");
  await expect(page.getByTestId("setting-music")).toContainText("aan");
  await page.reload();
  await expect(page.getByTestId("setting-sound")).toContainText("uit");
  await expect(page.getByTestId("setting-volume")).toContainText("75%");
});
