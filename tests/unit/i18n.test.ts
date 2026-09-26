import { afterEach, describe, expect, it } from "vitest";
import nl from "../../src/i18n/nl.json";
import en from "../../src/i18n/en.json";
import { setLanguage, t } from "../../src/i18n";

describe("i18n", () => {
  afterEach(() => setLanguage("nl"));

  it("has the same keys in every language", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(nl).sort());
  });

  it("uses Dutch by default", () => {
    expect(t("hud.score")).toBe("Punten");
  });

  it("fills placeholders", () => {
    expect(t("complete.score", { score: 120 })).toBe("Punten: 120");
  });

  it("switches language", () => {
    setLanguage("en");
    expect(t("hud.score")).toBe("Score");
  });
});
