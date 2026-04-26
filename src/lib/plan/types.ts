import type { Deal } from "@/lib/deals/types";
import type { MealLog } from "@/lib/log/types";
import type { Recipe } from "@/lib/recipes/types";

export type Store = "aldi" | "safeway" | "costco" | "wegmans";

export const STORES: readonly Store[] = ["aldi", "safeway", "costco", "wegmans"];

export interface DealMatchOnMeal {
  item: string;
  salePrice: string;
  store: string;
}

export interface MealPlanMeal {
  title: string;
  kidVersion: string | null;
  dealMatches: DealMatchOnMeal[];
}

export interface DealMatchOnGroceryItem {
  salePrice: string;
  validTo: string;
}

export interface GroceryItem {
  item: string;
  quantity: string;
  store: Store;
  dealMatch: DealMatchOnGroceryItem | null;
}

export interface MealPlan {
  /** Always exactly REQUIRED_MEAL_COUNT (5) entries — enforced by validateMealPlan. */
  meals: MealPlanMeal[];
  groceryList: GroceryItem[];
}

export type { MealLog };

export interface GeneratePlanInput {
  recipes: Recipe[];
  deals: Deal[];
  logs: MealLog[];
  pantry: string[];
  preferences?: string;
}

export const REQUIRED_MEAL_COUNT = 5;
