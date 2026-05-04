// Phase 2 shim — types for client-side swap-suggestion synthesis. Replace when
// /api/generate-plan ships per-slot swap suggestions with structured protein,
// prep, and lastMade fields.

import type { Recipe } from "@/lib/recipes/types";

/**
 * Canonical protein labels surfaced by `extractProtein`. Kept as a string union
 * for typing but tolerant of `null` when no keyword matches the recipe.
 */
export type ProteinLabel =
  | "fish"
  | "chicken"
  | "beef"
  | "pork"
  | "turkey"
  | "shrimp"
  | "vegetarian";

export interface RankedSuggestion {
  recipe: Recipe;
  protein: ProteinLabel | null;
  /** Days elapsed since the recipe was last cooked, or null when never matched in recentLogs. */
  daysAgo: number | null;
  /** Score from the ranker. Exposed for testing only — UI does not read it. */
  score: number;
}
