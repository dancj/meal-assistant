import type { RecipeRepository, MealPlanRepository } from "./types";

export type { RecipeRepository, MealPlanRepository, StoredMealPlan } from "./types";

let _recipeRepo: RecipeRepository | null = null;
let _mealPlanRepo: MealPlanRepository | null = null;

function isSupabaseConfigured(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getRecipeRepo(): RecipeRepository {
  if (!_recipeRepo) {
    if (isSupabaseConfigured()) {
      // Dynamic import to avoid loading Supabase client when not needed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseRecipeRepository } = require("./supabase");
      _recipeRepo = new SupabaseRecipeRepository();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SqliteRecipeRepository } = require("./sqlite");
      _recipeRepo = new SqliteRecipeRepository();
    }
  }
  return _recipeRepo!;
}

export function getMealPlanRepo(): MealPlanRepository {
  if (!_mealPlanRepo) {
    if (isSupabaseConfigured()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SupabaseMealPlanRepository } = require("./supabase");
      _mealPlanRepo = new SupabaseMealPlanRepository();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SqliteMealPlanRepository } = require("./sqlite");
      _mealPlanRepo = new SqliteMealPlanRepository();
    }
  }
  return _mealPlanRepo!;
}
