import type { Recipe } from "@/types/recipe";
import type { MealPlan } from "@/types/meal-plan";

export function isLocalMode(): boolean {
  return !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** @deprecated Use isLocalMode() instead */
export function isDemoMode(): boolean {
  return isLocalMode();
}

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// ---------------------------------------------------------------------------
// Mock meal plan generation (used when Gemini is not configured)
// ---------------------------------------------------------------------------

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}

export function generateDemoMealPlan(recipes: Recipe[]): MealPlan {
  const selected = recipes.slice(0, 5);
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ] as const;

  const dinners = selected.map((recipe, i) => ({
    day: days[i],
    recipeName: recipe.name,
    recipeId: recipe.id,
    servings: recipe.servings ?? 4,
    alternativeNote: null,
  }));

  // Build a consolidated grocery list from selected recipes
  const groceryMap = new Map<string, string[]>();
  for (const recipe of selected) {
    for (const ing of recipe.ingredients) {
      const key = ing.name.toLowerCase();
      const qty = `${ing.quantity} ${ing.unit}`.trim();
      const existing = groceryMap.get(key);
      if (existing) {
        existing.push(qty);
      } else {
        groceryMap.set(key, [qty]);
      }
    }
  }

  const groceryList = Array.from(groceryMap.entries()).map(([item, qtys]) => ({
    item,
    quantity: qtys.join(" + "),
  }));

  return {
    dinners,
    groceryList,
    weekOf: getNextMonday(),
  };
}
