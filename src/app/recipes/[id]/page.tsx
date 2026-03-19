import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import DeleteButton from "@/components/DeleteButton";
import type { Recipe } from "@/types/recipe";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const recipe = data as Recipe;

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        &larr; Back to recipes
      </Link>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          <div className="flex gap-3 shrink-0">
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </Link>
            <DeleteButton recipeId={recipe.id} />
          </div>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-4 mt-4 text-sm text-foreground/60">
          {recipe.servings && <span>{recipe.servings} servings</span>}
          {recipe.prep_time != null && <span>{recipe.prep_time} min prep</span>}
          {recipe.cook_time != null && <span>{recipe.cook_time} min cook</span>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Ingredients</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="text-sm">
              {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
            </li>
          ))}
        </ul>
      </section>

      {recipe.instructions && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Instructions</h2>
          <div className="text-sm whitespace-pre-wrap">{recipe.instructions}</div>
        </section>
      )}

      {recipe.notes && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Notes</h2>
          <div className="text-sm whitespace-pre-wrap">{recipe.notes}</div>
        </section>
      )}

      {recipe.source_url && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Source</h2>
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {recipe.source_url}
          </a>
        </section>
      )}
    </div>
  );
}
