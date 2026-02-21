export interface MealPlanDinner {
  day: string;
  recipeName: string;
  recipeId: string;
  servings: number;
  alternativeNote: string | null;
}

export interface GroceryItem {
  item: string;
  quantity: string;
}

export interface MealPlan {
  dinners: MealPlanDinner[];
  groceryList: GroceryItem[];
  weekOf: string;
}
