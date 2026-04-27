import { describe, expect, it } from "vitest";
import { initialState, planReducer, type PlanState } from "./state";
import type { MealPlan, MealPlanMeal } from "@/lib/plan/types";

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

const fivePlan = plan(["A", "B", "C", "D", "E"]);

const ready: PlanState = {
  status: "ready",
  recipes: [],
  deals: [],
  recentLogs: [],
  plan: fivePlan,
  generating: false,
  currentWeek: "2026-04-20",
  thumbs: [null, null, null, null, null],
  skipReason: "",
};

describe("planReducer / loading", () => {
  it("INIT_OK transitions to ready with generating: false", () => {
    const next = planReducer(initialState, {
      type: "INIT_OK",
      recipes: [],
      deals: [],
      recentLogs: [],
      plan: fivePlan,
      currentWeek: "2026-04-20",
    });
    expect(next).toEqual({
      status: "ready",
      recipes: [],
      deals: [],
      recentLogs: [],
      plan: fivePlan,
      generating: false,
      currentWeek: "2026-04-20",
      thumbs: [null, null, null, null, null],
      skipReason: "",
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
      plan: fivePlan,
      currentWeek: "2026-04-20",
    });
    expect(next.status).toBe("ready");
  });

  it("ignores in-flight actions (REGEN_OK, SWAP_OK) while errored", () => {
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

  it("REGEN_OK replaces the plan and clears generating", () => {
    const fresh = plan(["V", "W", "X", "Y", "Z"]);
    const next = planReducer(
      { ...ready, generating: true },
      { type: "REGEN_OK", plan: fresh },
    );
    expect(next).toMatchObject({
      status: "ready",
      plan: fresh,
      generating: false,
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

  it("SWAP_OK clears only the swapped slot's thumb", () => {
    const withThumbs: PlanState = {
      ...ready,
      thumbs: ["up", "down", "up", "down", "up"],
    };
    const fresh = plan(["NEW", "x", "x", "x", "x"]);
    const next = planReducer(withThumbs, {
      type: "SWAP_OK",
      index: 2,
      plan: fresh,
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.thumbs).toEqual(["up", "down", null, "down", "up"]);
  });
});

describe("planReducer / ready — swap", () => {
  it("SWAP_OK replaces only meals[index] and replaces groceryList wholesale", () => {
    const fresh = plan(["NEW", "ignored", "ignored", "ignored", "ignored"]);
    const next = planReducer(
      { ...ready, generating: true },
      { type: "SWAP_OK", index: 2, plan: fresh },
    );
    expect(next.status).toBe("ready");
    if (next.status !== "ready") return;
    expect(next.generating).toBe(false);
    expect(next.plan.meals.map((m) => m.title)).toEqual([
      "A",
      "B",
      "NEW",
      "D",
      "E",
    ]);
    expect(next.plan.groceryList).toBe(fresh.groceryList);
  });

  it("SWAP_OK with index >= 5 leaves meals untouched but clears generating", () => {
    const fresh = plan(["X", "X", "X", "X", "X"]);
    const next = planReducer(
      { ...ready, generating: true },
      { type: "SWAP_OK", index: 7, plan: fresh },
    );
    expect(next.status).toBe("ready");
    if (next.status !== "ready") return;
    expect(next.plan).toBe(ready.plan);
    expect(next.generating).toBe(false);
  });

  it("SWAP_OK with index < 0 leaves meals untouched", () => {
    const fresh = plan(["X", "X", "X", "X", "X"]);
    const next = planReducer(ready, {
      type: "SWAP_OK",
      index: -1,
      plan: fresh,
    });
    expect(next.status).toBe("ready");
    if (next.status !== "ready") return;
    expect(next.plan).toBe(ready.plan);
  });

  it("SWAP_OK with empty meals in returned plan is a safe no-op on meals", () => {
    const empty: MealPlan = { meals: [], groceryList: [] };
    const next = planReducer(ready, {
      type: "SWAP_OK",
      index: 0,
      plan: empty,
    });
    if (next.status !== "ready") throw new Error("expected ready");
    expect(next.plan).toBe(ready.plan);
  });

  it("SWAP_STARTED sets generating=true and keeps plan", () => {
    const next = planReducer(ready, { type: "SWAP_STARTED" });
    expect(next).toMatchObject({ generating: true });
    if (next.status === "ready") {
      expect(next.plan).toBe(ready.plan);
    }
  });

  it("SWAP_FAILED keeps the existing plan and clears generating", () => {
    const next = planReducer(
      { ...ready, generating: true },
      { type: "SWAP_FAILED", error: "x" },
    );
    expect(next).toMatchObject({ generating: false });
    if (next.status === "ready") {
      expect(next.plan).toBe(ready.plan);
    }
  });
});
