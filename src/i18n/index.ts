import nl from "./nl.json";
import en from "./en.json";

// Dutch is the source of truth: every key must exist in nl.json.
export type TextKey = keyof typeof nl;

const languages = { nl, en } as const;
export type Language = keyof typeof languages;

let current: Language = "nl";

export function setLanguage(language: Language): void {
  current = language;
}

/**
 * Look up a UI text. `{name}` placeholders are filled from `params`:
 *   t("complete.score", { score: 120 })  →  "Punten: 120"
 */
export function t(
  key: TextKey,
  params: Record<string, string | number> = {},
): string {
  const text: string = languages[current][key] ?? nl[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
