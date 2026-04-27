import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_DEALS,
  DEMO_LOGS,
  DEMO_PANTRY,
  DEMO_PLAN,
  DEMO_RECIPES,
  isDemoMode,
  rotatedDemoPlan,
} from "./fixtures";
import { REQUIRED_MEAL_COUNT, STORES } from "@/lib/plan/types";

describe("isDemoMode", () => {
  const original = process.env.DEMO_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = original;
  });

  it("returns true only when DEMO_MODE === '1'", () => {
    process.env.DEMO_MODE = "1";
    expect(isDemoMode()).toBe(true);
  });

  it("returns false when DEMO_MODE is unset", () => {
    delete process.env.DEMO_MODE;
    expect(isDemoMode()).toBe(false);
  });

  it("returns false for truthy-but-not-'1' values like 'true'", () => {
    process.env.DEMO_MODE = "true";
    expect(isDemoMode()).toBe(false);
  });

  it("returns false for empty string", () => {
    process.env.DEMO_MODE = "";
    expect(isDemoMode()).toBe(false);
  });
});

describe("DEMO_PLAN shape", () => {
  it("has exactly 5 meals to satisfy REQUIRED_MEAL_COUNT", () => {
    expect(DEMO_PLAN.meals).toHaveLength(REQUIRED_MEAL_COUNT);
  });

  it("uses only valid Store values in groceryList", () => {
    for (const item of DEMO_PLAN.groceryList) {
      expect(STORES).toContain(item.store);
    }
  });

  it("includes at least one item per store so the grouped UI exercises every section", () => {
    const stores = new Set(DEMO_PLAN.groceryList.map((i) => i.store));
    for (const s of STORES) {
      expect(stores.has(s)).toBe(true);
    }
  });
});

describe("rotatedDemoPlan", () => {
  it("returns the same 5 meals as DEMO_PLAN regardless of rotation", () => {
    const titles = DEMO_PLAN.meals.map((m) => m.title).sort();
    for (let i = 0; i < 10; i++) {
      const got = rotatedDemoPlan().meals.map((m) => m.title).sort();
      expect(got).toEqual(titles);
    }
  });

  it("preserves the grocery list reference", () => {
    expect(rotatedDemoPlan().groceryList).toBe(DEMO_PLAN.groceryList);
  });
});

describe("DEMO_RECIPES / DEMO_DEALS sanity", () => {
  it("has at least 5 recipes (so the LLM would have variety)", () => {
    expect(DEMO_RECIPES.length).toBeGreaterThanOrEqual(5);
  });

  it("has deals from both safeway and aldi", () => {
    const stores = new Set(DEMO_DEALS.map((d) => d.store));
    expect(stores.has("safeway")).toBe(true);
    expect(stores.has("aldi")).toBe(true);
  });
});

describe("DEMO_LOGS sanity", () => {
  it("has at least 3 weeks of recent activity", () => {
    expect(DEMO_LOGS.length).toBeGreaterThanOrEqual(3);
  });

  it("every entry has a valid YYYY-MM-DD week and string arrays", () => {
    for (const log of DEMO_LOGS) {
      expect(log.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(log.cooked.every((c) => typeof c === "string")).toBe(true);
      expect(log.skipped.every((s) => typeof s === "string")).toBe(true);
    }
  });

  it("includes at least one entry with a skipReason", () => {
    expect(DEMO_LOGS.some((l) => l.skipReason !== undefined)).toBe(true);
  });
});

describe("DEMO_PANTRY sanity", () => {
  it("has at least 5 staples and 1 freezer item", () => {
    expect(DEMO_PANTRY.staples.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_PANTRY.freezer.length).toBeGreaterThanOrEqual(1);
  });

  it("every entry is a non-empty string", () => {
    for (const s of DEMO_PANTRY.staples) {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    }
    for (const f of DEMO_PANTRY.freezer) {
      expect(typeof f).toBe("string");
      expect(f.length).toBeGreaterThan(0);
    }
  });
});
