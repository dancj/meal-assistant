import { describe, expect, it } from "vitest";
import { currentWeekStart } from "./week";

describe("currentWeekStart", () => {
  it("returns the Monday of a Wednesday", () => {
    // 2026-04-22 is a Wednesday
    expect(currentWeekStart(new Date("2026-04-22T12:00:00Z"))).toBe("2026-04-20");
  });

  it("returns the same date when called on a Monday", () => {
    expect(currentWeekStart(new Date("2026-04-20T08:00:00Z"))).toBe("2026-04-20");
  });

  it("returns the previous Monday when called on a Sunday", () => {
    // 2026-04-26 is a Sunday → Monday 2026-04-20
    expect(currentWeekStart(new Date("2026-04-26T22:00:00Z"))).toBe("2026-04-20");
  });

  it("crosses month boundaries correctly", () => {
    // 2026-05-01 is a Friday → Monday 2026-04-27
    expect(currentWeekStart(new Date("2026-05-01T00:00:00Z"))).toBe("2026-04-27");
  });

  it("output matches YYYY-MM-DD format", () => {
    expect(currentWeekStart()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
