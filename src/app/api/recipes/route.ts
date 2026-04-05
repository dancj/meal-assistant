import { NextResponse } from "next/server";
import { pickRecipeFields, validateRecipeBody } from "@/lib/recipe-validation";
import { getRecipeRepo } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const tag = searchParams.get("tag") || undefined;

    const repo = getRecipeRepo();
    const recipes = q || tag ? await repo.search({ q, tag }) : await repo.list();
    return NextResponse.json(recipes);
  } catch (err) {
    console.error("Failed to fetch recipes:", err);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validationError = validateRecipeBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const recipeData = pickRecipeFields(body);

  try {
    const repo = getRecipeRepo();
    const recipe = await repo.create(recipeData);
    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    console.error("Failed to create recipe:", err);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
