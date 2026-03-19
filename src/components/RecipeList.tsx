"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Recipe } from "@/types/recipe";

export default function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags))].sort(),
    [recipes]
  );

  const filtered = useMemo(() => {
    let result = recipes;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (activeTag) {
      result = result.filter((r) => r.tags.includes(activeTag));
    }
    return result;
  }, [recipes, search, activeTag]);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-16" data-testid="empty-state">
        <p className="text-lg text-foreground/60 mb-4">No recipes yet</p>
        <Link
          href="/recipes/new"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Add your first recipe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes..."
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          aria-label="Search recipes"
          data-testid="search-input"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTag === tag
                    ? "bg-foreground text-background"
                    : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                }`}
                data-testid={`tag-filter-${tag}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-8 text-foreground/60">
          No recipes match your search
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="block rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors"
              data-testid="recipe-list-item"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{recipe.name}</h2>
                {recipe.servings && (
                  <span className="text-sm text-foreground/50">
                    {recipe.servings} servings
                  </span>
                )}
              </div>
              {recipe.tags.length > 0 && (
                <div className="flex gap-1.5 mt-2">
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
