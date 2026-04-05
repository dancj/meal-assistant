import { getSupabase } from "@/lib/supabase";
import type { Recipe } from "@/types/recipe";
import type { MealPlan } from "@/types/meal-plan";
import type {
  RecipeRepository,
  RecipeSearchQuery,
  MealPlanRepository,
  StoredMealPlan,
} from "./types";

export class SupabaseRecipeRepository implements RecipeRepository {
  async list(): Promise<Recipe[]> {
    const { data, error } = await getSupabase()
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch recipes: ${error.message}`);
    return data as Recipe[];
  }

  async search(query: RecipeSearchQuery): Promise<Recipe[]> {
    let builder = getSupabase()
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (query.q) {
      builder = builder.ilike("name", `%${query.q}%`);
    }

    if (query.tag) {
      builder = builder.contains("tags", [query.tag]);
    }

    const { data, error } = await builder;
    if (error) throw new Error(`Failed to search recipes: ${error.message}`);
    return data as Recipe[];
  }

  async getById(id: string): Promise<Recipe | null> {
    const { data, error } = await getSupabase()
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch recipe: ${error.message}`);
    }
    return data as Recipe;
  }

  async create(
    data: Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>
  ): Promise<Recipe> {
    const { data: created, error } = await getSupabase()
      .from("recipes")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Failed to create recipe: ${error.message}`);
    return created as Recipe;
  }

  async update(id: string, data: Partial<Recipe>): Promise<Recipe | null> {
    const { data: updated, error } = await getSupabase()
      .from("recipes")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to update recipe: ${error.message}`);
    }
    return updated as Recipe;
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await getSupabase()
      .from("recipes")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return false;
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
    return !!data;
  }
}

export class SupabaseMealPlanRepository implements MealPlanRepository {
  async save(plan: MealPlan): Promise<StoredMealPlan> {
    const { data, error } = await getSupabase()
      .from("meal_plans")
      .insert({
        dinners: plan.dinners,
        grocery_list: plan.groceryList,
        week_of: plan.weekOf,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save meal plan: ${error.message}`);
    return {
      id: data.id,
      dinners: data.dinners,
      groceryList: data.grocery_list,
      weekOf: data.week_of,
      created_at: data.created_at,
    };
  }

  async getCurrent(): Promise<StoredMealPlan | null> {
    const { data, error } = await getSupabase()
      .from("meal_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch meal plan: ${error.message}`);
    }
    return {
      id: data.id,
      dinners: data.dinners,
      groceryList: data.grocery_list,
      weekOf: data.week_of,
      created_at: data.created_at,
    };
  }

  async list(limit = 10): Promise<StoredMealPlan[]> {
    const { data, error } = await getSupabase()
      .from("meal_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch meal plans: ${error.message}`);
    return (data ?? []).map(
      (row: {
        id: string;
        dinners: MealPlan["dinners"];
        grocery_list: MealPlan["groceryList"];
        week_of: string;
        created_at: string;
      }) => ({
        id: row.id,
        dinners: row.dinners,
        groceryList: row.grocery_list,
        weekOf: row.week_of,
        created_at: row.created_at,
      })
    );
  }
}
