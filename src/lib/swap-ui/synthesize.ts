// Phase 2 shim — derives suggestion metadata (protein, lastMade) from Recipe
// + MealLog inputs. Replace when /api/generate-plan ships per-recipe protein
// and lastMade fields directly on the response.

import type { MealLog } from "@/lib/log/types";
import type { Recipe } from "@/lib/recipes/types";

import type { ProteinLabel } from "./types";

/**
 * Mapping from keyword (case-insensitive substring) to canonical protein label.
 * Tag-side check uses exact match; title-side check uses substring includes.
 */
const PROTEIN_KEYWORDS: ReadonlyArray<{
  match: string;
  label: ProteinLabel;
}> = [
  // Direct labels (also used as tag exact-matches)
  { match: "fish", label: "fish" },
  { match: "chicken", label: "chicken" },
  { match: "beef", label: "beef" },
  { match: "pork", label: "pork" },
  { match: "turkey", label: "turkey" },
  { match: "shrimp", label: "shrimp" },
  { match: "vegetarian", label: "vegetarian" },
  { match: "vegan", label: "vegetarian" },
  // Title-only species → canonical label
  { match: "salmon", label: "fish" },
  { match: "cod", label: "fish" },
  { match: "tilapia", label: "fish" },
  { match: "tuna", label: "fish" },
  { match: "halibut", label: "fish" },
  { match: "mahi", label: "fish" },
  { match: "tofu", label: "vegetarian" },
  { match: "black bean", label: "vegetarian" },
  { match: "lentil", label: "vegetarian" },
  { match: "chickpea", label: "vegetarian" },
];

/**
 * Best-effort protein extraction. Tag-side: exact case-insensitive match
 * against canonical labels. Title-side: case-insensitive substring match
 * against the same labels and additional species keywords.
 *
 * Returns `null` when nothing matches — the suggestion renders without a
 * protein pill rather than guessing.
 */
export function extractProtein(recipe: Recipe): ProteinLabel | null {
  const tagsLower = recipe.tags.map((t) => t.trim().toLowerCase());
  for (const { match, label } of PROTEIN_KEYWORDS) {
    if (tagsLower.includes(match)) return label;
  }
  const titleLower = recipe.title.toLowerCase();
  for (const { match, label } of PROTEIN_KEYWORDS) {
    if (titleLower.includes(match)) return label;
  }
  return null;
}

/**
 * Best-effort protein extraction from a meal-plan title alone (no tags).
 * Used for the current-slot meal in the ranker, since `MealPlanMeal` does
 * not carry tag data.
 */
export function extractProteinFromTitle(title: string): ProteinLabel | null {
  const titleLower = title.toLowerCase();
  for (const { match, label } of PROTEIN_KEYWORDS) {
    if (titleLower.includes(match)) return label;
  }
  return null;
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Days elapsed between `weekStart` and the most recent `MealLog` whose
 * `cooked` array contains a case-insensitive match for `recipe.title`.
 *
 * Returns `null` when no log entry matches. Logs with malformed `week`
 * strings are silently skipped — the ranker should not throw on
 * imperfect data from the recipes repo.
 */
export function lastMadeDays(
  recipe: Recipe,
  recentLogs: MealLog[],
  weekStart: Date,
): number | null {
  const target = normalizeTitle(recipe.title);
  const sorted = recentLogs
    .map((log) => {
      const t = Date.parse(log.week);
      return Number.isNaN(t) ? null : { log, t };
    })
    .filter((x): x is { log: MealLog; t: number } => x !== null)
    .sort((a, b) => b.t - a.t);

  for (const { log, t } of sorted) {
    const matches = log.cooked.some((c) => normalizeTitle(c) === target);
    if (matches) {
      return Math.floor((weekStart.getTime() - t) / 86_400_000);
    }
  }
  return null;
}
