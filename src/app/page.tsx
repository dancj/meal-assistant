"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RecipeList from "@/components/RecipeList";
import type { Recipe } from "@/types/recipe";

function RecipeListSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-4xl" />
          <Skeleton className="h-5 w-20 rounded-4xl" />
          <Skeleton className="h-5 w-14 rounded-4xl" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="px-4 py-3 border-l-2 border-l-primary/10">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex gap-1 mt-1.5">
              <Skeleton className="h-4 w-12 rounded-4xl" />
              <Skeleton className="h-4 w-16 rounded-4xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
    return <RecipeListSkeleton />;
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
