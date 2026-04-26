import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_DEALS,
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
