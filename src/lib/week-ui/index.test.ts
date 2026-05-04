import { describe, expect, it } from "vitest";

import {
  formatDayShort,
  formatWeekRange,
  getMondayOfWeek,
  synthesizeDay,
  weekIssueNumber,
} from "./index";

const isoDate = (s: string) => new Date(`${s}T12:00:00Z`);

describe("getMondayOfWeek", () => {
  it("rolls a Thursday back to Monday", () => {
    expect(getMondayOfWeek(isoDate("2026-04-30")).toISOString().slice(0, 10)).toBe(
      "2026-04-27",
    );
  });

  it("rolls Sunday back 6 days, not forward 1", () => {
    expect(getMondayOfWeek(isoDate("2026-05-03")).toISOString().slice(0, 10)).toBe(
      "2026-04-27",
    );
  });

  it("returns the same date when given Monday", () => {
    expect(getMondayOfWeek(isoDate("2026-04-27")).toISOString().slice(0, 10)).toBe(
      "2026-04-27",
    );
  });

  it("uses UTC components, not local timezone", () => {
    expect(getMondayOfWeek(new Date("2026-04-26T22:00:00Z")).toISOString().slice(0, 10)).toBe(
      "2026-04-20",
    );
  });
});

describe("formatDayShort", () => {
  it("returns three-letter uppercase day codes", () => {
    expect(formatDayShort(isoDate("2026-04-27"))).toBe("MON");
    expect(formatDayShort(isoDate("2026-04-28"))).toBe("TUE");
    expect(formatDayShort(isoDate("2026-04-30"))).toBe("THU");
    expect(formatDayShort(isoDate("2026-05-01"))).toBe("FRI");
  });
});

describe("formatWeekRange", () => {
  it("formats Mon–Sun range with em-dash", () => {
    expect(formatWeekRange(isoDate("2026-04-27"))).toBe("Apr 27 — May 03");
  });

  it("crosses month boundaries naturally", () => {
    expect(formatWeekRange(isoDate("2026-04-27"))).toMatch(/Apr 27 — May 03/);
  });

  it("crosses year boundaries naturally", () => {
    expect(formatWeekRange(isoDate("2025-12-29"))).toBe("Dec 29 — Jan 04");
  });
});

describe("weekIssueNumber", () => {
  it("returns ISO 8601 week number for a date in week 18 of 2026", () => {
    expect(weekIssueNumber(isoDate("2026-04-30"))).toBe(18);
  });

  it("returns 17 for the prior week", () => {
    expect(weekIssueNumber(isoDate("2026-04-23"))).toBe(17);
  });

  it("treats 2025-12-29 as ISO week 1 of 2026, not week 53 of 2025", () => {
    // 2025-12-29 is a Monday and the Thursday-of-week (2026-01-01) is in 2026
    expect(weekIssueNumber(isoDate("2025-12-29"))).toBe(1);
  });

  it("returns week 1 for 2026-01-05", () => {
    expect(weekIssueNumber(isoDate("2026-01-05"))).toBe(2);
  });
});

describe("synthesizeDay", () => {
  const weekStart = isoDate("2026-04-27");

  it("derives the dayKey from index", () => {
    const meal = { title: "Pasta", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 0, weekStart).dayKey).toBe("MON");
    expect(synthesizeDay(meal, 4, weekStart).dayKey).toBe("FRI");
  });

  it("formats dateLabel as MMM D", () => {
    const meal = { title: "Pasta", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 0, weekStart).dateLabel).toBe("Apr 27");
    expect(synthesizeDay(meal, 4, weekStart).dateLabel).toBe("May 01");
  });

  it("recognizes Tuesday + taco as Taco Tuesday theme", () => {
    const meal = { title: "Black bean tacos", kidVersion: null, dealMatches: [] };
    const day = synthesizeDay(meal, 1, weekStart);
    expect(day.theme).toEqual({ tag: "taco-tuesday", label: "Taco Tuesday" });
  });

  it("recognizes Tuesday + quesadilla as Taco Tuesday theme", () => {
    const meal = { title: "Chicken quesadilla", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 1, weekStart).theme?.tag).toBe("taco-tuesday");
  });

  it("recognizes Friday + salmon as Fish Friday theme", () => {
    const meal = { title: "Salmon with rice", kidVersion: null, dealMatches: [] };
    const day = synthesizeDay(meal, 4, weekStart);
    expect(day.theme).toEqual({ tag: "fish-friday", label: "Fish Friday" });
  });

  it("recognizes Friday + sushi as Fish Friday theme (widened keyword list)", () => {
    const meal = { title: "Sushi night", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 4, weekStart).theme?.tag).toBe("fish-friday");
  });

  it("returns null theme when no keyword matches", () => {
    const meal = { title: "Sausage skillet", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 1, weekStart).theme).toBeNull();
  });

  it("returns null theme when keyword matches but day index is wrong", () => {
    // Tacos on Wednesday: no theme
    const meal = { title: "Beef tacos", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 2, weekStart).theme).toBeNull();
  });

  it("returns kidNote when kidVersion is non-empty", () => {
    const meal = {
      title: "Sheet-pan chicken",
      kidVersion: "use cheese instead",
      dealMatches: [],
    };
    expect(synthesizeDay(meal, 0, weekStart).kidNote).toEqual({
      who: null,
      text: "use cheese instead",
    });
  });

  it("treats empty kidVersion string as null kidNote", () => {
    const meal = { title: "Pasta", kidVersion: "", dealMatches: [] };
    expect(synthesizeDay(meal, 0, weekStart).kidNote).toBeNull();
  });

  it("returns null kidNote when kidVersion is null", () => {
    const meal = { title: "Pasta", kidVersion: null, dealMatches: [] };
    expect(synthesizeDay(meal, 0, weekStart).kidNote).toBeNull();
  });

  it("populates metadata with all-null Phase 2 placeholders", () => {
    const meal = { title: "Pasta", kidVersion: null, dealMatches: [] };
    const day = synthesizeDay(meal, 0, weekStart);
    expect(day.metadata).toEqual({
      protein: null,
      prepMinutes: null,
      daysAgo: null,
    });
  });
});
