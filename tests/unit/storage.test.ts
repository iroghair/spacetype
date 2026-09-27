import { describe, expect, it } from "vitest";
import { SaveStore, type KeyValueStore } from "../../src/storage/storage";

function fakeStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const run = { score: 100, spm: 30, accuracy: 0.9, stars: 2 };

describe("SaveStore", () => {
  it("starts empty", () => {
    expect(new SaveStore(fakeStore()).best("1")).toBeUndefined();
  });

  it("records a first run and returns no previous best", () => {
    const store = new SaveStore(fakeStore());
    expect(store.record("1", run)).toBeUndefined();
    expect(store.best("1")).toEqual(run);
  });

  it("keeps the best of each field and returns the previous best", () => {
    const store = new SaveStore(fakeStore());
    store.record("1", run);
    const previous = store.record("1", {
      score: 80,
      spm: 40,
      accuracy: 0.8,
      stars: 1,
    });
    expect(previous).toEqual(run);
    expect(store.best("1")).toEqual({
      score: 100,
      spm: 40,
      accuracy: 0.9,
      stars: 2,
    });
  });

  it("survives a reload", () => {
    const backing = fakeStore();
    new SaveStore(backing).record("3", run);
    expect(new SaveStore(backing).best("3")).toEqual(run);
  });

  it("ignores corrupt data and data from another version", () => {
    expect(
      new SaveStore(fakeStore({ spacetype: "{not json" })).best("1"),
    ).toBeUndefined();
    expect(
      new SaveStore(
        fakeStore({ spacetype: '{"version":99,"bests":{"1":{}}}' }),
      ).best("1"),
    ).toBeUndefined();
  });

  it("keeps working when storage throws", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const store = new SaveStore(broken);
    store.record("1", run);
    expect(store.best("1")).toEqual(run);
  });

  it("has the finger guide on by default and remembers when it is switched off", () => {
    const backing = fakeStore();
    const store = new SaveStore(backing);
    expect(store.settings.fingerGuide).toBe(true);
    store.updateSettings({ fingerGuide: false });
    expect(new SaveStore(backing).settings.fingerGuide).toBe(false);
  });

  it("reads saves from before settings existed", () => {
    const old =
      '{"version":1,"bests":{"1":{"score":5,"spm":1,"accuracy":1,"stars":1}}}';
    const store = new SaveStore(fakeStore({ spacetype: old }));
    expect(store.settings.fingerGuide).toBe(true);
    expect(store.best("1")?.score).toBe(5);
  });

  it("has fly-bys on by default", () => {
    expect(new SaveStore(fakeStore()).settings.flyBys).toBe(true);
  });

  it("reset forgets all records and settings, also after a reload", () => {
    const backing = fakeStore();
    const store = new SaveStore(backing);
    store.record("1", run);
    store.updateSettings({ fingerGuide: false, flyBys: false });
    store.reset();
    expect(store.best("1")).toBeUndefined();
    expect(store.settings).toMatchObject({ fingerGuide: true, flyBys: true });
    expect(new SaveStore(backing).best("1")).toBeUndefined();
  });
});
