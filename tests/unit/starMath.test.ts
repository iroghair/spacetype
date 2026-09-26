import { describe, expect, it } from "vitest";
import { driftX } from "../../src/game/starMath";

describe("driftX", () => {
  it("moves right by speed × seconds", () => {
    expect(driftX(100, 10, 1, 500, 1280)).toBe(105);
  });

  it("moves left when direction is -1", () => {
    expect(driftX(100, 10, -1, 1000, 1280)).toBe(90);
  });

  it("wraps past the right edge back to the left", () => {
    expect(driftX(1275, 10, 1, 1000, 1280)).toBe(5);
  });

  it("wraps past the left edge back to the right", () => {
    expect(driftX(3, 10, -1, 1000, 1280)).toBe(1273);
  });

  it("does not move when no time has passed", () => {
    expect(driftX(42, 10, 1, 0, 1280)).toBe(42);
  });
});
