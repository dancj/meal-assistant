import type { Deal } from "@/lib/deals/types";
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
  meals: MealPlanMeal[];
  groceryList: GroceryItem[];
}

// #68 will own the real shape; this placeholder keeps the contract forward-compatible.
export interface MealLog {
  date: string;
  title: string;
}

export interface GeneratePlanInput {
  recipes: Recipe[];
  deals: Deal[];
  logs: MealLog[];
  pantry: string[];
  preferences?: string;
}

export const REQUIRED_MEAL_COUNT = 5;
