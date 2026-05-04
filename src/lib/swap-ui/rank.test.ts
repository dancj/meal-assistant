import { describe, expect, it } from "vitest";

import type { MealLog } from "@/lib/log/types";
import type { MealPlanMeal } from "@/lib/plan/types";
import type { Recipe } from "@/lib/recipes/types";

import { swapSuggestions } from "./rank";

const recipe = (title: string, tags: string[] = []): Recipe => ({
  title,
  tags,
  kidVersion: null,
  content: "",
  filename: `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
});

const meal = (title: string): MealPlanMeal => ({
  title,
  kidVersion: null,
  dealMatches: [],
});

const isoDate = (s: string) => new Date(`${s}T12:00:00Z`);
const weekStart = isoDate("2026-04-27");

describe("swapSuggestions", () => {
  it("returns up to 3 results sorted alphabetically when no rules apply", () => {
    const allRecipes = [
      recipe("Zucchini bake"),
      recipe("Apple cobbler"),
      recipe("Mango salad"),
      recipe("Borscht"),
    ];
    const allMeals = [meal("Sausage skillet")];
    const result = swapSuggestions({
      slotIndex: 0,
      currentMeal: meal("Sausage skillet"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.recipe.title)).toEqual([
      "Apple cobbler",
      "Borscht",
      "Mango salad",
    ]);
  });

  it("filters out recipes whose title matches any current meal in the plan", () => {
    const allRecipes = [
      recipe("Tacos"),
      recipe("Pasta"),
      recipe("Salmon"),
      recipe("Chili"),
      recipe("Curry"),
    ];
    const allMeals = [
      meal("Tacos"),
      meal("Pasta"),
      meal("Salmon"),
      meal("Chili"),
      meal("Curry"),
    ];
    const result = swapSuggestions({
      slotIndex: 0,
      currentMeal: meal("Tacos"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result).toEqual([]);
  });

  it("title comparison is case-insensitive and trim-tolerant", () => {
    const allRecipes = [recipe("  TACOS  "), recipe("Pasta")];
    const allMeals = [meal("tacos")];
    const result = swapSuggestions({
      slotIndex: 0,
      currentMeal: meal("Other"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result.map((r) => r.recipe.title)).toEqual(["Pasta"]);
  });

  it("boosts theme matches via recipe tags on Tuesday", () => {
    const allRecipes = [
      recipe("Black bean tacos", ["dinner", "vegetarian"]),
      recipe("Cheese ravioli", ["dinner"]),
    ];
    const allMeals = [meal("Sausage skillet")];
    const result = swapSuggestions({
      slotIndex: 1, // TUE
      currentMeal: meal("Sausage skillet"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result[0].recipe.title).toBe("Black bean tacos");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("boosts theme matches via title keywords on Friday", () => {
    const allRecipes = [
      recipe("Roast chicken thighs"),
      recipe("Pan-seared salmon", ["dinner"]),
    ];
    const allMeals = [meal("Pasta")];
    const result = swapSuggestions({
      slotIndex: 4, // FRI
      currentMeal: meal("Pasta"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result[0].recipe.title).toBe("Pan-seared salmon");
  });

  it("boosts protein-rotation when current meal protein differs from candidate", () => {
    const allRecipes = [
      recipe("Pan-seared salmon", ["fish"]),
      recipe("Honey chicken", ["chicken"]),
    ];
    const allMeals = [meal("Roast chicken thighs")];
    const result = swapSuggestions({
      slotIndex: 4, // FRI: theme match for fish
      currentMeal: meal("Roast chicken thighs"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    // Salmon: theme +10, rotation +5 = 15. Honey chicken: same protein, no boosts = 0.
    expect(result[0].recipe.title).toBe("Pan-seared salmon");
    expect(result[0].score).toBe(15);
    expect(result[1].score).toBe(0);
  });

  it("does not apply rotation boost when either side's protein is null", () => {
    const allRecipes = [recipe("Mystery stew"), recipe("Chicken soup")];
    const allMeals = [meal("Pasta")];
    const result = swapSuggestions({
      slotIndex: 0, // MON, no theme
      currentMeal: meal("Pasta"), // unknown protein
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result.every((s) => s.score === 0)).toBe(true);
  });

  it("returns at most 3 suggestions even with many candidates", () => {
    const allRecipes = Array.from({ length: 10 }, (_, i) => recipe(`Recipe ${i}`));
    const result = swapSuggestions({
      slotIndex: 0,
      currentMeal: meal("Other"),
      allRecipes,
      allMeals: [],
      recentLogs: [],
      weekStart,
    });
    expect(result).toHaveLength(3);
  });

  it("attaches protein and daysAgo metadata to each suggestion", () => {
    const allRecipes = [recipe("Salmon", ["fish"])];
    const logs: MealLog[] = [
      { week: "2026-04-20", cooked: ["Salmon"], skipped: [] },
    ];
    const result = swapSuggestions({
      slotIndex: 4,
      currentMeal: meal("Pasta"),
      allRecipes,
      allMeals: [],
      recentLogs: logs,
      weekStart,
    });
    expect(result[0]).toMatchObject({
      protein: "fish",
      daysAgo: 7,
    });
  });

  it("returns empty array when every candidate is also in the plan", () => {
    const allRecipes = [recipe("A"), recipe("B"), recipe("C")];
    const allMeals = [meal("A"), meal("B"), meal("C")];
    const result = swapSuggestions({
      slotIndex: 0,
      currentMeal: meal("A"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result).toEqual([]);
  });

  it("returns the single eligible recipe when only one is available", () => {
    const allRecipes = [recipe("A"), recipe("B")];
    const allMeals = [meal("B")];
    const result = swapSuggestions({
      slotIndex: 0,
      currentMeal: meal("Other"),
      allRecipes,
      allMeals,
      recentLogs: [],
      weekStart,
    });
    expect(result.map((r) => r.recipe.title)).toEqual(["A"]);
  });
});
