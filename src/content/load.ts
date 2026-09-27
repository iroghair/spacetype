import type { Content, Entry, Level, Topics } from "./types";

// Loads the generated content from public/content/<lang>/. BASE_URL is
// "/spacetype/" on GitHub Pages and "/" locally, so this works in both places.
export async function loadContent(lang = "nl"): Promise<Content> {
  const base = `${import.meta.env.BASE_URL}content/${lang}/`;
  const get = async <T>(file: string): Promise<T> => {
    const response = await fetch(base + file);
    if (!response.ok)
      throw new Error(`Could not load ${file}: ${response.status}`);
    return (await response.json()) as T;
  };
  const [levels, words, sentences, topics] = await Promise.all([
    get<Level[]>("levels.json"),
    get<Entry[]>("words.json"),
    get<Entry[]>("sentences.json"),
    get<Topics>("topics.json"),
  ]);
  return { levels, words, sentences, topics };
}
