"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import type { Recipe } from "@/types/recipe";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${params.id}`);
        if (res.status === 404) {
          setError("Recipe not found");
          return;
        }
        if (!res.ok) {
          setError("Failed to load recipe");
          return;
        }
        setRecipe(await res.json());
      } catch {
        setError("Failed to load recipe");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return <p className="text-center py-8 text-foreground/60">Loading...</p>;
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400 mb-4">{error ?? "Recipe not found"}</p>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="recipe-detail">
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
              data-testid="edit-btn"
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
