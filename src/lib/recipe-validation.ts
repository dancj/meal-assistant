import type { Ingredient } from "@/types/recipe";

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

export function pickRecipeFields(body: Record<string, unknown>) {
  const picked: Record<string, unknown> = {};
  for (const field of RECIPE_FIELDS) {
    if (field in body) {
      picked[field] = body[field];
    }
  }
  return picked;
}

export function validateRecipeBody(
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
