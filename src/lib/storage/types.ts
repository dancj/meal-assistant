import type { Recipe } from "@/types/recipe";
import type { MealPlan } from "@/types/meal-plan";

export interface StoredMealPlan extends MealPlan {
  id: string;
  created_at: string;
}

export interface RecipeRepository {
  list(): Promise<Recipe[]>;
  getById(id: string): Promise<Recipe | null>;
  create(
    data: Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>
  ): Promise<Recipe>;
  update(id: string, data: Partial<Recipe>): Promise<Recipe | null>;
  delete(id: string): Promise<boolean>;
}

export interface MealPlanRepository {
  save(plan: MealPlan): Promise<StoredMealPlan>;
  getCurrent(): Promise<StoredMealPlan | null>;
  list(limit?: number): Promise<StoredMealPlan[]>;
}
