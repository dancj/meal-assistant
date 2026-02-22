import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { Ingredient } from "@/types/recipe";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid recipe ID format" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    console.error("Failed to fetch recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid recipe ID format" },
      { status: 400 }
    );
  }

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

  const recipeData = {
    ...pickRecipeFields(body),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabase()
    .from("recipes")
    .update(recipeData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    console.error("Failed to update recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid recipe ID format" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabase()
    .from("recipes")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    console.error("Failed to delete recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Recipe not found" },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
