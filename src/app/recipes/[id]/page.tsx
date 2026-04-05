"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Clock, Users, ShoppingBasket, ChefHat, NotebookPen, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
    return (
      <div data-testid="recipe-detail-skeleton">
        <Skeleton className="h-4 w-28 mb-6" />
        <div className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-1.5 mt-3">
            <Skeleton className="h-5 w-16 rounded-4xl" />
            <Skeleton className="h-5 w-20 rounded-4xl" />
          </div>
          <div className="flex gap-4 mt-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Card className="mt-8">
          <CardContent>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-full max-w-xs" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardContent>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive mb-4">{error ?? "Recipe not found"}</p>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="recipe-detail">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to recipes
      </Link>

      <div className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{recipe.name}</h1>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              data-testid="edit-btn"
            >
              <Pencil className="size-3.5" data-icon="inline-start" />
              Edit
            </Link>
            <DeleteButton recipeId={recipe.id} />
          </div>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
          {recipe.servings && (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {recipe.servings} servings
            </span>
          )}
          {recipe.prep_time != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {recipe.prep_time} min prep
            </span>
          )}
          {recipe.cook_time != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {recipe.cook_time} min cook
            </span>
          )}
        </div>
      </div>

      <Separator className="mt-6" />

      <Card className="mt-6">
        <CardContent>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><ShoppingBasket className="size-4 text-primary/60" />Ingredients</h2>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-sm flex items-baseline gap-2">
                <span className="size-1.5 rounded-full bg-primary/30 shrink-0 mt-1.5" />
                {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.instructions && (
        <Card className="mt-4">
          <CardContent>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><ChefHat className="size-4 text-primary/60" />Instructions</h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{recipe.instructions}</div>
          </CardContent>
        </Card>
      )}

      {recipe.notes && (
        <Card className="mt-4">
          <CardContent>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><NotebookPen className="size-4 text-primary/60" />Notes</h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{recipe.notes}</div>
          </CardContent>
        </Card>
      )}

      {recipe.source_url && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Link2 className="size-4 text-primary/60" />Source</h2>
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {recipe.source_url}
          </a>
        </div>
      )}
    </div>
  );
}
