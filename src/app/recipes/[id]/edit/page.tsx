"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
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

    toast.success("Recipe updated");
    router.push(`/recipes/${params.id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
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
    <div>
      <Link
        href={`/recipes/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to recipe
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mt-4 mb-6">Edit Recipe</h1>
      <RecipeForm
        initialData={recipe}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
