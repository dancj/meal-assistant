import { describe, expect, it } from "vitest";
import { initialState, planReducer, type PlanState } from "./state";
import type { MealPlan, MealPlanMeal } from "@/lib/plan/types";
import type { Recipe } from "@/lib/recipes/types";

function meal(title: string): MealPlanMeal {
  return { title, kidVersion: null, dealMatches: [] };
}

function plan(titles: string[]): MealPlan {
  return {
    meals: titles.map(meal),
    groceryList: [
      { item: titles[0] ?? "x", quantity: "1", store: "aldi", dealMatch: null },
    ],
  };
}

function recipe(title: string, kidVersion: string | null = null): Recipe {
  return {
    title,
    tags: [],
    kidVersion,
    content: "",
    filename: `${title.toLowerCase()}.md`,
  };
}

const fivePlan = plan(["A", "B", "C", "D", "E"]);

const ready: PlanState = {
  status: "ready",
  recipes: [],
  deals: [],
  recentLogs: [],
  pantry: { staples: [], freezer: [] },
  plan: fivePlan,
  generating: false,
  currentWeek: "2026-04-20",
  thumbs: [null, null, null, null, null],
  skipReason: "",
  swapTarget: null,
  planMutatedSinceGenerate: false,
};

describe("planReducer / loading", () => {
  it("INIT_OK transitions to ready with all flags initialized", () => {
    const next = planReducer(initialState, {
      type: "INIT_OK",
      recipes: [],
      deals: [],
      recentLogs: [],
      pantry: { staples: [], freezer: [] },
      plan: fivePlan,
      currentWeek: "2026-04-20",
    });
    expect(next).toEqual({
      status: "ready",
      recipes: [],
      deals: [],
      recentLogs: [],
      pantry: { staples: [], freezer: [] },
      plan: fivePlan,
      generating: false,
      currentWeek: "2026-04-20",
      thumbs: [null, null, null, null, null],
      skipReason: "",
      swapTarget: null,
      planMutatedSinceGenerate: false,
    });
  });

  it("INIT_FAILED transitions to error with the supplied message", () => {
    const next = planReducer(initialState, {
      type: "INIT_FAILED",
      error: "boom",
    });
    expect(next).toEqual({ status: "error", error: "boom" });
  });

  it("ignores unrelated actions while loading (no-op)", () => {
    const next = planReducer(initialState, { type: "REGEN_STARTED" });
    expect(next).toBe(initialState);
  });
});

describe("planReducer / error", () => {
  const errored: PlanState = { status: "error", error: "x" };

  it("RETRY transitions back to loading", () => {
    const next = planReducer(errored, { type: "RETRY" });
    expect(next).toEqual({ status: "loading" });
  });

  it("INIT_OK transitions error -> ready (e.g., after explicit retry resolved)", () => {
    const next = planReducer(errored, {
      type: "INIT_OK",
      recipes: [],
      deals: [],
      recentLogs: [],
      pantry: { staples: [], freezer: [] },
      plan: fivePlan,
      currentWeek: "2026-04-20",
    });
    expect(next.status).toBe("ready");
  });

  it("ignores in-flight actions while errored", () => {
    const next = planReducer(errored, { type: "REGEN_OK", plan: fivePlan });
    expect(next).toBe(errored);
  });
});

describe("planReducer / ready — regenerate", () => {
  it("REGEN_STARTED sets generating=true and keeps plan", () => {
    const next = planReducer(ready, { type: "REGEN_STARTED" });
    expect(next).toMatchObject({ status: "ready", generating: true });
    if (next.status === "ready") {
      expect(next.plan).toBe(ready.plan);
    }
  });

  it("REGEN_OK replaces the plan, clears generating, and clears planMutatedSinceGenerate", () => {
    const fresh = plan(["V", "W", "X", "Y", "Z"]);
    const next = planReducer(
      { ...ready, generating: true, planMutatedSinceGenerate: true },
      { type: "REGEN_OK", plan: fresh },
    );
    expect(next).toMatchObject({
      status: "ready",
      plan: fresh,
      generating: false,
      planMutatedSinceGenerate: false,
    });
  });

  it("REGEN_FAILED keeps the existing plan and clears generating", () => {
    const next = planReducer(
      { ...ready, generating: true },
      { type: "REGEN_FAILED", error: "anthropic timeout" },
    );
    expect(next).toMatchObject({
      status: "ready",
      generating: false,
    });
    if (next.status === "ready") {
      expect(next.plan).toBe(ready.plan);
    }
  });

  it("REGEN_STARTED while drawer is open leaves swapTarget alone", () => {
    const withDrawer: PlanState = { ...ready, swapTarget: 2 };
    const next = planReducer(withDrawer, { type: "REGEN_STARTED" });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.swapTarget).toBe(2);
  });
});

describe("planReducer / ready — thumbs", () => {
  it("SET_THUMB sets the per-meal value", () => {
    const next = planReducer(ready, {
      type: "SET_THUMB",
      index: 2,
      value: "up",
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.thumbs).toEqual([null, null, "up", null, null]);
  });

  it("SET_THUMB ignores out-of-range index", () => {
    const next = planReducer(ready, {
      type: "SET_THUMB",
      index: 10,
      value: "down",
    });
    expect(next).toBe(ready);
  });

  it("SET_SKIP_REASON updates the reason", () => {
    const next = planReducer(ready, {
      type: "SET_SKIP_REASON",
      reason: "tired",
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.skipReason).toBe("tired");
  });

  it("REGEN_OK clears all thumbs (new plan, new clicks)", () => {
    const withThumbs: PlanState = {
      ...ready,
      thumbs: ["up", "down", null, null, "up"],
    };
    const next = planReducer(withThumbs, {
      type: "REGEN_OK",
      plan: fivePlan,
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.thumbs).toEqual([null, null, null, null, null]);
  });
});

describe("planReducer / ready — swap drawer", () => {
  it("OPEN_SWAP_DRAWER sets swapTarget to the slot index", () => {
    const next = planReducer(ready, { type: "OPEN_SWAP_DRAWER", index: 2 });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.swapTarget).toBe(2);
  });

  it("OPEN_SWAP_DRAWER while generating is a no-op", () => {
    const generating: PlanState = { ...ready, generating: true };
    const next = planReducer(generating, { type: "OPEN_SWAP_DRAWER", index: 2 });
    expect(next).toBe(generating);
  });

  it("OPEN_SWAP_DRAWER ignores out-of-range indices", () => {
    expect(planReducer(ready, { type: "OPEN_SWAP_DRAWER", index: -1 })).toBe(ready);
    expect(planReducer(ready, { type: "OPEN_SWAP_DRAWER", index: 99 })).toBe(ready);
  });

  it("CLOSE_SWAP_DRAWER clears swapTarget", () => {
    const open: PlanState = { ...ready, swapTarget: 3 };
    const next = planReducer(open, { type: "CLOSE_SWAP_DRAWER" });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.swapTarget).toBeNull();
  });
});

describe("planReducer / ready — apply swap (local)", () => {
  it("APPLY_SWAP_LOCAL replaces meals[index] with recipe data and preserves grocery list", () => {
    const r = recipe("Pan-seared salmon", "no spice");
    const open: PlanState = { ...ready, swapTarget: 2 };
    const next = planReducer(open, {
      type: "APPLY_SWAP_LOCAL",
      index: 2,
      recipe: r,
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.plan.meals.map((m) => m.title)).toEqual([
      "A",
      "B",
      "Pan-seared salmon",
      "D",
      "E",
    ]);
    expect(next.plan.meals[2]).toEqual({
      title: "Pan-seared salmon",
      kidVersion: "no spice",
      dealMatches: [],
    });
    // Grocery list reference stays the same (still last regen's data).
    expect(next.plan.groceryList).toBe(ready.plan.groceryList);
  });

  it("APPLY_SWAP_LOCAL clears the swapped slot's thumb but preserves others", () => {
    const r = recipe("X");
    const withThumbs: PlanState = {
      ...ready,
      thumbs: ["up", "down", "up", "down", "up"],
      swapTarget: 2,
    };
    const next = planReducer(withThumbs, {
      type: "APPLY_SWAP_LOCAL",
      index: 2,
      recipe: r,
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.thumbs).toEqual(["up", "down", null, "down", "up"]);
  });

  it("APPLY_SWAP_LOCAL clears swapTarget", () => {
    const open: PlanState = { ...ready, swapTarget: 1 };
    const next = planReducer(open, {
      type: "APPLY_SWAP_LOCAL",
      index: 1,
      recipe: recipe("X"),
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.swapTarget).toBeNull();
  });

  it("APPLY_SWAP_LOCAL sets planMutatedSinceGenerate to true", () => {
    const next = planReducer(ready, {
      type: "APPLY_SWAP_LOCAL",
      index: 0,
      recipe: recipe("X"),
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.planMutatedSinceGenerate).toBe(true);
  });

  it("REGEN_OK after APPLY_SWAP_LOCAL resets planMutatedSinceGenerate to false", () => {
    const mutated = planReducer(ready, {
      type: "APPLY_SWAP_LOCAL",
      index: 0,
      recipe: recipe("X"),
    });
    const fresh = plan(["F", "F", "F", "F", "F"]);
    const next = planReducer(mutated, { type: "REGEN_OK", plan: fresh });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.planMutatedSinceGenerate).toBe(false);
  });

  it("APPLY_SWAP_LOCAL ignores out-of-range indices", () => {
    expect(
      planReducer(ready, {
        type: "APPLY_SWAP_LOCAL",
        index: -1,
        recipe: recipe("X"),
      }),
    ).toBe(ready);
    expect(
      planReducer(ready, {
        type: "APPLY_SWAP_LOCAL",
        index: 99,
        recipe: recipe("X"),
      }),
    ).toBe(ready);
  });
});
