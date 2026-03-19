"use client";

import { useEffect, useState } from "react";
import RecipeList from "@/components/RecipeList";
import type { Recipe } from "@/types/recipe";

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/recipes");
        if (!res.ok) {
          setError("Failed to load recipes. Please try again later.");
          return;
        }
        setRecipes(await res.json());
      } catch {
        setError("Failed to load recipes. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-center py-8 text-foreground/60">Loading...</p>;
  }

  if (error) {
    return (
      <p className="text-center py-8 text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  return <RecipeList recipes={recipes} />;
}
