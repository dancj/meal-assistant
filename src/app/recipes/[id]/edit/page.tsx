"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import RecipeForm from "@/components/RecipeForm";
import type { RecipeFormData } from "@/components/RecipeForm";
import type { Recipe } from "@/types/recipe";

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${params.id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Recipe not found" : "Failed to load recipe");
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

  async function handleSubmit(data: RecipeFormData) {
    const res = await fetch(`/api/recipes/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to update recipe");
    }

    router.push(`/recipes/${params.id}`);
    router.refresh();
  }

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
    <div>
      <Link
        href={`/recipes/${params.id}`}
        className="text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        &larr; Back to recipe
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Edit Recipe</h1>
      <RecipeForm
        initialData={recipe}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
