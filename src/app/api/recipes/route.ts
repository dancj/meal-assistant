import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { Ingredient } from "@/types/recipe";

export const dynamic = "force-dynamic";

const RECIPE_FIELDS = [
  "name",
  "ingredients",
  "instructions",
  "tags",
  "servings",
  "prep_time",
  "cook_time",
  "source_url",
  "notes",
] as const;

function pickRecipeFields(body: Record<string, unknown>) {
  const picked: Record<string, unknown> = {};
  for (const field of RECIPE_FIELDS) {
    if (field in body) {
      picked[field] = body[field];
    }
  }
  return picked;
}

function validateRecipeBody(
  body: Record<string, unknown>
): string | null {
  if (typeof body.name !== "string" || body.name.trim() === "") {
    return "name is required and must be a non-empty string";
  }

  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return "ingredients is required and must be a non-empty array";
  }

  for (let i = 0; i < body.ingredients.length; i++) {
    const ingredient = body.ingredients[i] as Partial<Ingredient>;
    if (
      typeof ingredient?.name !== "string" ||
      ingredient.name.trim() === ""
    ) {
      return `ingredients[${i}].name is required and must be a non-empty string`;
    }
  }

  return null;
}

export async function GET() {
  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
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

  const { data, error } = await getSupabase()
    .from("recipes")
    .insert(recipeData)
    .select()
    .single();

  if (error) {
    console.error("Failed to create recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
