// Phase 2 shim — ranks recipes for the SwapDrawer's three suggestion slots.
// Replace when /api/generate-plan ships per-slot suggestion ranking, or when
// a richer recipe shape lands.

import type { MealLog } from "@/lib/log/types";
import type { MealPlanMeal } from "@/lib/plan/types";
import type { Recipe } from "@/lib/recipes/types";
import { FISH_KEYWORDS, TACO_KEYWORDS } from "@/lib/week-ui";

import { extractProtein, extractProteinFromTitle, lastMadeDays } from "./synthesize";
import type { RankedSuggestion } from "./types";

/**
 * Score weights are tunable here. Theme match dominates rotation since "Taco
 * Tuesday" is a stronger family signal than "different protein than yesterday";
 * if real-world ranking feels off, adjust here rather than redesigning.
 */
const SCORE_THEME_MATCH = 10;
const SCORE_PROTEIN_ROTATION = 5;

interface SwapSuggestionsArgs {
  slotIndex: number;
  currentMeal: MealPlanMeal;
  allRecipes: Recipe[];
  allMeals: MealPlanMeal[];
  recentLogs: MealLog[];
  weekStart: Date;
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase();
}

function matchesAny(haystack: string, needles: readonly string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/**
 * Returns true when the recipe matches the slot's theme (taco-tuesday on
 * index=1, fish-friday on index=4). Either tag membership or title keyword
 * counts as a match.
 */
function matchesTheme(recipe: Recipe, slotIndex: number): boolean {
  const tagsLower = recipe.tags.map((t) => t.trim().toLowerCase());
  if (slotIndex === 1) {
    if (tagsLower.includes("taco-tuesday")) return true;
    return matchesAny(recipe.title, TACO_KEYWORDS);
  }
  if (slotIndex === 4) {
    if (tagsLower.includes("fish-friday")) return true;
    return matchesAny(recipe.title, FISH_KEYWORDS);
  }
  return false;
}

/**
 * Rank candidate recipes for the slot at `slotIndex` and return up to 3.
 *
 * Rules per design/spec.md §3.1:
 *   1. Exclude recipes already used elsewhere in the current week.
 *   2. Boost recipes whose tags/title match the slot's theme.
 *   3. Boost recipes with a protein different from the current slot's meal.
 *   4. (Future) Family-member like/dislike weighting — currently not factored.
 *   5. Take top 3.
 *
 * Tie-break by recipe.title ascending so output is deterministic across runs.
 */
export function swapSuggestions({
  slotIndex,
  currentMeal,
  allRecipes,
  allMeals,
  recentLogs,
  weekStart,
}: SwapSuggestionsArgs): RankedSuggestion[] {
  const usedTitles = new Set(allMeals.map((m) => normalizeTitle(m.title)));
  const currentProtein = extractProteinFromTitle(currentMeal.title);

  const eligible = allRecipes.filter(
    (r) => !usedTitles.has(normalizeTitle(r.title)),
  );

  const scored: RankedSuggestion[] = eligible.map((recipe) => {
    let score = 0;
    if (matchesTheme(recipe, slotIndex)) score += SCORE_THEME_MATCH;

    const protein = extractProtein(recipe);
    if (currentProtein !== null && protein !== null && protein !== currentProtein) {
      score += SCORE_PROTEIN_ROTATION;
    }

    return {
      recipe,
      protein,
      daysAgo: lastMadeDays(recipe, recentLogs, weekStart),
      score,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.recipe.title.localeCompare(b.recipe.title);
  });

  return scored.slice(0, 3);
}
