import type { Recipe } from "@/types/recipe";
import type { MealPlan } from "@/types/meal-plan";
import { DEMO_RECIPES } from "@/lib/demo-data";

export function isDemoMode(): boolean {
  return !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// ---------------------------------------------------------------------------
// In-memory recipe store (resets on server restart)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [...DEMO_RECIPES];

function nextId(): string {
  return "d0000000-0000-0000-0000-" + crypto.randomUUID().slice(-12);
}

export const demoStore = {
  listRecipes(): Recipe[] {
    return [...recipes].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getRecipe(id: string): Recipe | undefined {
    return recipes.find((r) => r.id === id);
  },

  createRecipe(data: Partial<Recipe>): Recipe {
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: nextId(),
      name: data.name ?? "",
      ingredients: data.ingredients ?? [],
      instructions: data.instructions ?? null,
      tags: data.tags ?? [],
      servings: data.servings ?? null,
      prep_time: data.prep_time ?? null,
      cook_time: data.cook_time ?? null,
      source_url: data.source_url ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
    recipes.push(recipe);
    return recipe;
  },

  updateRecipe(id: string, data: Partial<Recipe>): Recipe | null {
    const idx = recipes.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    recipes[idx] = {
      ...recipes[idx],
      ...data,
      id, // preserve id
      updated_at: new Date().toISOString(),
    };
    return recipes[idx];
  },

  deleteRecipe(id: string): boolean {
    const idx = recipes.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    recipes.splice(idx, 1);
    return true;
  },
};

// ---------------------------------------------------------------------------
// Mock meal plan generation
// ---------------------------------------------------------------------------

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}

export function generateDemoMealPlan(): MealPlan {
  const available = demoStore.listRecipes();
  const selected = available.slice(0, 5);
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
