"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center py-12 text-destructive">
        {error}
      </p>
    );
  }

  return <RecipeList recipes={recipes} />;
}
