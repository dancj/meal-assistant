import { describe, expect, it } from "vitest";
import { MalformedPlanError } from "./errors";
import type { MealPlan } from "./types";
import { validateMealPlan } from "./validate";

function makeMeal(overrides: Partial<MealPlan["meals"][number]> = {}) {
  return {
    title: "Sheet-Pan Chicken",
    kidVersion: null,
    dealMatches: [],
    ...overrides,
  };
}

function makePlan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    meals: [makeMeal({ title: "M1" }), makeMeal({ title: "M2" }), makeMeal({ title: "M3" }), makeMeal({ title: "M4" }), makeMeal({ title: "M5" })],
    groceryList: [],
    ...overrides,
  };
}

describe("validateMealPlan — happy paths", () => {
  it("parses a valid 5-meal plan with empty grocery list", () => {
    const plan = makePlan();
    const result = validateMealPlan(JSON.stringify(plan));
    expect(result.meals).toHaveLength(5);
    expect(result.groceryList).toEqual([]);
  });

  it("parses a plan with populated meals and grocery list", () => {
    const plan = makePlan({
      meals: [
        makeMeal({
          title: "Pad Thai",
          kidVersion: "no chili",
          dealMatches: [
            { item: "tofu", salePrice: "$1.99", store: "aldi" },
          ],
        }),
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
      groceryList: [
        {
          item: "Tofu",
          quantity: "14 oz",
          store: "aldi",
          dealMatch: { salePrice: "$1.99", validTo: "2026-04-29" },
        },
        {
          item: "Brown rice",
          quantity: "1 lb",
          store: "costco",
          dealMatch: null,
        },
      ],
    });
    const result = validateMealPlan(JSON.stringify(plan));
    expect(result.meals[0].title).toBe("Pad Thai");
    expect(result.meals[0].kidVersion).toBe("no chili");
    expect(result.meals[0].dealMatches).toHaveLength(1);
    expect(result.groceryList).toHaveLength(2);
    expect(result.groceryList[0].dealMatch).toEqual({
      salePrice: "$1.99",
      validTo: "2026-04-29",
    });
  });

  it("strips ```json fences before parsing", () => {
    const plan = makePlan();
    const wrapped = "```json\n" + JSON.stringify(plan) + "\n```";
    const result = validateMealPlan(wrapped);
    expect(result.meals).toHaveLength(5);
  });

  it("strips bare ``` fences (no language tag) before parsing", () => {
    const plan = makePlan();
    const wrapped = "```\n" + JSON.stringify(plan) + "\n```";
    const result = validateMealPlan(wrapped);
    expect(result.meals).toHaveLength(5);
  });

  it("drops unknown extra keys on meals", () => {
    const planWithExtra = {
      ...makePlan(),
      meals: [
        { ...makeMeal({ title: "M1" }), extraField: "ignored" },
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
    };
    const result = validateMealPlan(JSON.stringify(planWithExtra));
    expect(result.meals[0]).not.toHaveProperty("extraField");
    expect(result.meals[0].title).toBe("M1");
  });

  it("drops unknown extra keys on grocery items", () => {
    const planWithExtra = makePlan({
      groceryList: [
        {
          item: "Tofu",
          quantity: "14 oz",
          store: "aldi",
          dealMatch: null,
          extraField: "ignored",
        } as unknown as MealPlan["groceryList"][number],
      ],
    });
    const result = validateMealPlan(JSON.stringify(planWithExtra));
    expect(result.groceryList[0]).not.toHaveProperty("extraField");
  });

  it("accepts kidVersion: null", () => {
    const plan = makePlan({
      meals: [
        makeMeal({ title: "M1", kidVersion: null }),
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
    });
    const result = validateMealPlan(JSON.stringify(plan));
    expect(result.meals[0].kidVersion).toBeNull();
  });

  it("accepts dealMatch: null on grocery items", () => {
    const plan = makePlan({
      groceryList: [
        { item: "salt", quantity: "to taste", store: "aldi", dealMatch: null },
      ],
    });
    const result = validateMealPlan(JSON.stringify(plan));
    expect(result.groceryList[0].dealMatch).toBeNull();
  });

  it("accepts dealMatches: [] on meals", () => {
    const plan = makePlan();
    const result = validateMealPlan(JSON.stringify(plan));
    expect(result.meals[0].dealMatches).toEqual([]);
  });
});

describe("validateMealPlan — error paths", () => {
  it("throws MalformedPlanError for non-JSON input", () => {
    expect(() => validateMealPlan("hello world")).toThrow(MalformedPlanError);
    try {
      validateMealPlan("hello world");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("<root>");
      expect((err as MalformedPlanError).message).toMatch(/JSON/);
    }
  });

  it("throws when root is not an object (array)", () => {
    expect(() => validateMealPlan("[]")).toThrow(MalformedPlanError);
  });

  it("throws when root is not an object (null)", () => {
    expect(() => validateMealPlan("null")).toThrow(MalformedPlanError);
  });

  it("throws when meals field is missing", () => {
    expect(() =>
      validateMealPlan(JSON.stringify({ groceryList: [] })),
    ).toThrow(MalformedPlanError);
    try {
      validateMealPlan(JSON.stringify({ groceryList: [] }));
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("meals");
    }
  });

  it("throws when meals length is 4", () => {
    const plan = makePlan({
      meals: [makeMeal(), makeMeal(), makeMeal(), makeMeal()],
    });
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("meals");
      expect((err as MalformedPlanError).message).toMatch(/expected 5.*got 4/);
    }
  });

  it("throws when meals length is 6", () => {
    const plan = makePlan({
      meals: [
        makeMeal(),
        makeMeal(),
        makeMeal(),
        makeMeal(),
        makeMeal(),
        makeMeal(),
      ],
    });
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).message).toMatch(/expected 5.*got 6/);
    }
  });

  it("throws when meals[0].title is empty string", () => {
    const plan = makePlan({
      meals: [
        makeMeal({ title: "" }),
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
    });
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("meals[0].title");
    }
  });

  it("throws when meals[0].title is a number", () => {
    const plan = {
      meals: [
        { title: 123, kidVersion: null, dealMatches: [] },
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
      groceryList: [],
    };
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("meals[0].title");
    }
  });

  it("throws when meals[0].kidVersion is a number", () => {
    const plan = {
      meals: [
        { title: "M1", kidVersion: 123, dealMatches: [] },
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
      groceryList: [],
    };
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("meals[0].kidVersion");
    }
  });

  it("throws when meals[0].dealMatches is not an array", () => {
    const plan = {
      meals: [
        { title: "M1", kidVersion: null, dealMatches: "x" },
        makeMeal({ title: "M2" }),
        makeMeal({ title: "M3" }),
        makeMeal({ title: "M4" }),
        makeMeal({ title: "M5" }),
      ],
      groceryList: [],
    };
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("meals[0].dealMatches");
    }
  });

  it("throws when groceryList[0].store is not in the allowed set", () => {
    const plan = makePlan({
      groceryList: [
        {
          item: "x",
          quantity: "1",
          store: "wholefoods" as unknown as MealPlan["groceryList"][number]["store"],
          dealMatch: null,
        },
      ],
    });
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("groceryList[0].store");
      expect((err as MalformedPlanError).message).toMatch(/aldi/);
    }
  });

  it("throws when groceryList[0].dealMatch.salePrice is a number", () => {
    const plan = {
      meals: makePlan().meals,
      groceryList: [
        {
          item: "x",
          quantity: "1",
          store: "aldi",
          dealMatch: { salePrice: 1.99, validTo: "2026-04-29" },
        },
      ],
    };
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe(
        "groceryList[0].dealMatch.salePrice",
      );
    }
  });

  it("throws when fenced inner content is invalid JSON", () => {
    const fenced = "```json\nnot json at all\n```";
    try {
      validateMealPlan(fenced);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("<root>");
    }
  });

  it("throws when groceryList is missing", () => {
    const plan = { meals: makePlan().meals };
    try {
      validateMealPlan(JSON.stringify(plan));
      throw new Error("expected throw");
    } catch (err) {
      expect((err as MalformedPlanError).path).toBe("groceryList");
    }
  });
});
