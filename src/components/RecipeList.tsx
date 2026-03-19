"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
      <div className="text-center py-20" data-testid="empty-state">
        <BookOpen className="size-12 text-primary/30 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground mb-2">No recipes yet</p>
        <p className="text-sm text-muted-foreground/70 mb-6">
          Add your first recipe to get started with meal planning.
        </p>
        <Link
          href="/recipes/new"
          className="text-primary hover:underline font-medium text-sm"
        >
          Add your first recipe &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="pl-9"
            aria-label="Search recipes"
            data-testid="search-input"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={activeTag === tag ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                data-testid={`tag-filter-${tag}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          No recipes match your search
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              data-testid="recipe-list-item"
            >
              <Card className="px-4 py-3 hover:bg-accent/60 hover:border-primary/20 transition-colors cursor-pointer border-l-2 border-l-primary/20">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{recipe.name}</h2>
                  {recipe.servings && (
                    <span className="text-xs text-muted-foreground">
                      {recipe.servings} servings
                    </span>
                  )}
                </div>
                {recipe.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px] h-4 px-1.5 text-primary/80">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
