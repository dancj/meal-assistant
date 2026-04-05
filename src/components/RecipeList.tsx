"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, Clock, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Recipe } from "@/types/recipe";

const CUISINE_EMOJI: Record<string, string> = {
  asian: "🍜",
  italian: "🍝",
  mexican: "🌮",
  indian: "🍛",
  japanese: "🍱",
  chinese: "🥡",
  thai: "🍲",
  mediterranean: "🫒",
  french: "🥐",
  korean: "🥘",
  seafood: "🐟",
  vegetarian: "🥬",
  salad: "🥗",
  curry: "🍛",
  "comfort-food": "🫕",
};

function getRecipeEmoji(tags: string[]): string {
  for (const tag of tags) {
    if (CUISINE_EMOJI[tag]) return CUISINE_EMOJI[tag];
  }
  return "🍽️";
}

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
        <div className="flex flex-col gap-4">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="block"
              data-testid="recipe-list-item"
            >
              <Card className="px-5 py-4 hover:bg-accent/50 hover:border-primary/25 hover:shadow-sm transition-all cursor-pointer border-l-3 border-l-primary/30">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
                    {getRecipeEmoji(recipe.tags)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-medium truncate">{recipe.name}</h2>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                        {(recipe.prep_time || recipe.cook_time) && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {[recipe.prep_time && `${recipe.prep_time}m prep`, recipe.cook_time && `${recipe.cook_time}m cook`].filter(Boolean).join(" + ")}
                          </span>
                        )}
                        {recipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {recipe.servings}
                          </span>
                        )}
                      </div>
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {recipe.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[11px] h-5 px-2 text-primary/80">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
