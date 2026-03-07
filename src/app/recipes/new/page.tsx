"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import RecipeForm from "@/components/RecipeForm";
import type { RecipeFormData } from "@/components/RecipeForm";

export default function NewRecipePage() {
  const router = useRouter();

  async function handleSubmit(data: RecipeFormData) {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to create recipe");
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        &larr; Back to recipes
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Add Recipe</h1>
      <RecipeForm onSubmit={handleSubmit} submitLabel="Add Recipe" />
    </div>
  );
}
