import { describe, expect, it } from "vitest";
import {
  levelSource,
  textCount,
  topicSource,
} from "../../src/content/TextSource";
import type { Band, Content, Topic } from "../../src/content/types";
import { config } from "../../src/config";
import { seededRandom } from "../../src/engine/random";

const band1: Band = {
  id: 1,
  name: "Makkelijk",
  maxLength: 45,
  targetSpm: 60,
  runLength: 80,
};
const band2: Band = {
  id: 2,
  name: "Gemiddeld",
  maxLength: 90,
  targetSpm: 75,
  runLength: 120,
};
const topic: Topic = {
  id: "vissen",
  name: "Vissen",
  texts: [
    { text: "Mijn vis zwemt rondjes.", band: 1, difficulty: 1 },
    { text: "Een goudvis is oranje.", band: 1, difficulty: 1 },
    {
      text: "De haai heeft veel tanden en zwemt heel snel door de zee.",
      band: 2,
      difficulty: 2,
    },
  ],
};

describe("topicSource", () => {
  it("builds runs from the topic's texts in the chosen band only", () => {
    const source = topicSource(topic, band1, config.runner);
    const text = source.nextText(seededRandom(1));
    expect(text).toContain("vis");
    expect(text).not.toContain("haai");
    expect(text.length).toBeGreaterThanOrEqual(band1.runLength * 0.9);
  });

  it("uses the band's target and a per-topic, per-band id", () => {
    const source = topicSource(topic, band2, config.runner);
    expect(source).toMatchObject({
      id: "topic-vissen-2",
      label: "Vissen",
      targetSpm: 75,
    });
  });

  it("counts texts per band", () => {
    expect(textCount(topic, band1)).toBe(2);
    expect(textCount(topic, band2)).toBe(1);
  });
});

describe("levelSource", () => {
  it("keeps level ids as the bests key, so saved records stay valid", () => {
    const level = {
      id: 3,
      name: "x",
      newKeys: "fj ",
      allKeys: "fj ",
      targetSpm: 40,
      runLength: 30,
      segments: [{ type: "drill" as const, share: 1 }],
    };
    const content = {
      levels: [level],
      words: [],
      sentences: [],
      topics: { bands: [], topics: [] },
    } as Content;
    const source = levelSource(level, content, "Level 3", config.runner);
    expect(source.id).toBe("3");
    expect(source.nextText(seededRandom(2))).toMatch(/^[fj ]+$/);
  });
});
