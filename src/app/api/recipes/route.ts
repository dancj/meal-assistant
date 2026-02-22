import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pickRecipeFields, validateRecipeBody } from "@/lib/recipe-validation";

export const dynamic = "force-dynamic";

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
