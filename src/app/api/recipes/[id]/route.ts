import { NextResponse } from "next/server";
import { pickRecipeFields, validateRecipeBody } from "@/lib/recipe-validation";
import { getRecipeRepo } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid recipe ID format" },
      { status: 400 }
    );
  }

  try {
    const recipe = await getRecipeRepo().getById(id);
    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(recipe);
  } catch (err) {
    console.error("Failed to fetch recipe:", err);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

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

  const recipeData = pickRecipeFields(body);

  try {
    const updated = await getRecipeRepo().update(id, recipeData);
    if (!updated) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Failed to update recipe:", err);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid recipe ID format" },
      { status: 400 }
    );
  }

  try {
    const deleted = await getRecipeRepo().delete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Failed to delete recipe:", err);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
