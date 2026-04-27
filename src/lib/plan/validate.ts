import { MalformedPlanError } from "./errors";
import {
  REQUIRED_MEAL_COUNT,
  STORES,
  type DealMatchOnGroceryItem,
  type DealMatchOnMeal,
  type GroceryItem,
  type MealPlan,
  type MealPlanMeal,
  type Store,
} from "./types";

// Shape-only validator. Semantic correctness (kid-version mirroring, pantry
// omission, deal-flag accuracy) is the model's responsibility; this validator
// only enforces that the response matches the MealPlan TypeScript interface.

const FENCE_RX = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/;

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const match = FENCE_RX.exec(trimmed);
  return match !== null ? match[1].trim() : trimmed;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value)
  );
}

function isStore(value: string): value is Store {
  return (STORES as readonly string[]).includes(value);
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new MalformedPlanError(path, `expected string, got ${typeof value}`);
  }
  return value;
}

function expectNonEmptyString(value: unknown, path: string): string {
  const s = expectString(value, path);
  if (s === "") {
    throw new MalformedPlanError(path, "expected non-empty string");
  }
  return s;
}

function expectStringOrNull(value: unknown, path: string): string | null {
  if (value === null) return null;
  return expectString(value, path);
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new MalformedPlanError(
      path,
      `expected array, got ${value === null ? "null" : typeof value}`,
    );
  }
  return value;
}

function expectStore(value: unknown, path: string): Store {
  const s = expectString(value, path);
  if (!isStore(s)) {
    throw new MalformedPlanError(
      path,
      `expected one of ${STORES.join("|")}, got "${s}"`,
    );
  }
  return s;
}

function validateDealMatchOnMeal(value: unknown, path: string): DealMatchOnMeal {
  if (!isPlainObject(value)) {
    throw new MalformedPlanError(path, "expected object");
  }
  return {
    item: expectString(value.item, `${path}.item`),
    salePrice: expectString(value.salePrice, `${path}.salePrice`),
    store: expectString(value.store, `${path}.store`),
  };
}

function validateMeal(value: unknown, path: string): MealPlanMeal {
  if (!isPlainObject(value)) {
    throw new MalformedPlanError(path, "expected object");
  }
  const dealMatchesRaw = expectArray(value.dealMatches, `${path}.dealMatches`);
  const dealMatches = dealMatchesRaw.map((dm, i) =>
    validateDealMatchOnMeal(dm, `${path}.dealMatches[${i}]`),
  );
  return {
    title: expectNonEmptyString(value.title, `${path}.title`),
    kidVersion: expectStringOrNull(value.kidVersion, `${path}.kidVersion`),
    dealMatches,
  };
}

function validateGroceryDealMatch(
  value: unknown,
  path: string,
): DealMatchOnGroceryItem | null {
  if (value === null) return null;
  if (!isPlainObject(value)) {
    throw new MalformedPlanError(path, "expected object or null");
  }
  return {
    salePrice: expectString(value.salePrice, `${path}.salePrice`),
    validTo: expectString(value.validTo, `${path}.validTo`),
  };
}

function validateGroceryItem(value: unknown, path: string): GroceryItem {
  if (!isPlainObject(value)) {
    throw new MalformedPlanError(path, "expected object");
  }
  return {
    item: expectNonEmptyString(value.item, `${path}.item`),
    quantity: expectString(value.quantity, `${path}.quantity`),
    store: expectStore(value.store, `${path}.store`),
    dealMatch: validateGroceryDealMatch(value.dealMatch, `${path}.dealMatch`),
  };
}

export function assertMealPlan(value: unknown): MealPlan {
  if (!isPlainObject(value)) {
    throw new MalformedPlanError("<root>", "expected JSON object");
  }

  const mealsRaw = expectArray(value.meals, "meals");
  if (mealsRaw.length !== REQUIRED_MEAL_COUNT) {
    throw new MalformedPlanError(
      "meals",
      `expected ${REQUIRED_MEAL_COUNT} meals, got ${mealsRaw.length}`,
    );
  }
  const meals = mealsRaw.map((m, i) => validateMeal(m, `meals[${i}]`));

  const groceryListRaw = expectArray(value.groceryList, "groceryList");
  const groceryList = groceryListRaw.map((g, i) =>
    validateGroceryItem(g, `groceryList[${i}]`),
  );

  return { meals, groceryList };
}

export function validateMealPlan(rawText: string): MealPlan {
  const stripped = stripFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new MalformedPlanError("<root>", `not valid JSON: ${detail}`);
  }

  return assertMealPlan(parsed);
}
