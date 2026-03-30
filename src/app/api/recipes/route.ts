import { NextResponse } from "next/server";
import { pickRecipeFields, validateRecipeBody } from "@/lib/recipe-validation";
import { getRecipeRepo } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recipes = await getRecipeRepo().list();
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
    const recipe = await getRecipeRepo().create(recipeData);
    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    console.error("Failed to create recipe:", err);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
