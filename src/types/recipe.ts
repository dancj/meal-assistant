export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  instructions: string | null;
  tags: string[];
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
