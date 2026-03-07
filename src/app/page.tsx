import { getSupabase } from "@/lib/supabase";
import RecipeList from "@/components/RecipeList";
import type { Recipe } from "@/types/recipe";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: recipes, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-center py-8 text-red-600 dark:text-red-400">
        Failed to load recipes. Please try again later.
      </p>
    );
  }

  return <RecipeList recipes={(recipes as Recipe[]) ?? []} />;
}
