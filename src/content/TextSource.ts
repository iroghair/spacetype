import { buildRunText, type RunnerOptions } from "../engine/levelRunner";
import type { Band, Content, Level, Topic } from "./types";

// Where the text of a run comes from. The game only needs these few things,
// so a new kind of source (for example a live text generator) can be added
// later without touching the engine or the screens that play a run.
export interface TextSource {
  /** Key for saving personal bests, e.g. "3" (level 3) or "topic-vissen-2". */
  id: string;
  /** Short name for the HUD, e.g. "Level 3" or "Vissen". */
  label: string;
  targetSpm: number;
  /** A fresh text for one run. */
  nextText(random: () => number): string;
}

/** A normal level: drill, mixed drill, words or sentences from levels.json. */
export function levelSource(
  level: Level,
  content: Content,
  label: string,
  options: RunnerOptions,
): TextSource {
  return {
    id: String(level.id),
    label,
    targetSpm: level.targetSpm,
    nextText: (random) => buildRunText(level, content, random, options),
  };
}

/** Approved texts about one topic, at one difficulty band. */
export function topicSource(
  topic: Topic,
  band: Band,
  options: RunnerOptions,
): TextSource {
  // A topic run is a one-segment "level" made of the topic's texts, so it
  // reuses the level runner (shuffled, no repeats until every text was used).
  const texts = topic.texts.filter((t) => t.band === band.id);
  const allKeys = [...new Set(texts.flatMap((t) => Array.from(t.text)))].join(
    "",
  );
  const level: Level = {
    id: 0,
    name: topic.name,
    newKeys: "",
    allKeys,
    targetSpm: band.targetSpm,
    runLength: band.runLength,
    segments: [{ type: "sentences", share: 1 }],
  };
  const sentences = texts.map((t) => ({
    text: t.text,
    level: 0,
    difficulty: t.difficulty,
  }));
  return {
    id: `topic-${topic.id}-${band.id}`,
    label: topic.name,
    targetSpm: band.targetSpm,
    nextText: (random) =>
      buildRunText(level, { words: [], sentences }, random, options),
  };
}

/** How many approved texts a topic has in a band. */
export function textCount(topic: Topic, band: Band): number {
  return topic.texts.filter((t) => t.band === band.id).length;
}
