import { NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";
import { sendMealPlanEmail } from "@/lib/email";
import { Type } from "@google/genai";
import type { Recipe } from "@/types/recipe";
import type { MealPlan } from "@/types/meal-plan";
import { isGeminiAvailable } from "@/lib/demo-mode";
import { getRecipeRepo, getMealPlanRepo } from "@/lib/storage";
import { generateDemoMealPlan } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PREFERENCES_LENGTH = 500;

const MEAL_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    dinners: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: {
            type: Type.STRING,
            description: "Day of the week",
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
          recipeName: {
            type: Type.STRING,
            description: "Name of the selected recipe",
          },
          recipeId: {
            type: Type.STRING,
            description: "UUID of the recipe from the provided list",
          },
          servings: {
            type: Type.INTEGER,
            description: "Number of servings to prepare",
          },
          alternativeNote: {
            type: Type.STRING,
            nullable: true,
            description:
              "Brief alternative for household members with dietary needs, or null",
          },
        },
        required: [
          "day",
          "recipeName",
          "recipeId",
          "servings",
          "alternativeNote",
        ],
      },
    },
    groceryList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: {
            type: Type.STRING,
            description: "Grocery item name",
          },
          quantity: {
            type: Type.STRING,
            description: "Amount needed (e.g., '2 lbs', '1 can', '3')",
          },
        },
        required: ["item", "quantity"],
      },
    },
    weekOf: {
      type: Type.STRING,
      description: "ISO date string for the Monday of the meal plan week",
    },
  },
  required: ["dinners", "groceryList", "weekOf"],
};

const SYSTEM_INSTRUCTION = `You are a meal planning assistant for a household. Your job is to select 5 dinners for the upcoming week from the provided recipe pool and generate a consolidated grocery list.

Guidelines:
- Select exactly 5 different recipes for Monday through Friday
- Prioritize variety in cuisine type, protein source, and cooking method
- Respect any dietary preferences or constraints provided
- For household members with special dietary needs, provide a brief alternative suggestion in the alternativeNote field (e.g., "Kid alternative: plain pasta with butter"). Set alternativeNote to null if no alternative is needed.
- Generate a deduplicated grocery list combining all ingredients from the selected recipes
- Adjust grocery quantities based on the number of servings for each dinner`;

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}

function formatRecipesForPrompt(recipes: Recipe[]): string {
  return recipes
    .map((r) => {
      const tags = r.tags.length > 0 ? r.tags.join(", ") : "none";
      const servings =
        r.servings !== null ? String(r.servings) : "not specified";
      const ingredients = r.ingredients
        .map((i) => `    - ${i.quantity} ${i.unit} ${i.name}`.trimEnd())
        .join("\n");
      return `- ID: ${r.id}\n  Name: ${r.name}\n  Tags: ${tags}\n  Servings: ${servings}\n  Ingredients:\n${ingredients}`;
    })
    .join("\n\n");
}

function validateMealPlan(
  plan: MealPlan,
  recipeIds: Set<string>
): string | null {
  if (!Array.isArray(plan.dinners) || plan.dinners.length !== 5) {
    return `Expected exactly 5 dinners, got ${plan.dinners?.length ?? 0}`;
  }

  const seenIds = new Set<string>();
  for (const dinner of plan.dinners) {
    if (!recipeIds.has(dinner.recipeId)) {
      return `Invalid recipeId: ${dinner.recipeId}`;
    }
    if (seenIds.has(dinner.recipeId)) {
      return `Duplicate recipeId: ${dinner.recipeId}`;
    }
    seenIds.add(dinner.recipeId);
  }

  return null;
}

export async function POST(request: Request) {
  // 1. Validate auth (skip if CRON_SECRET is not configured)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Parse optional body
  let preferences: string | undefined;
  try {
    const body = await request.json();
    preferences =
      typeof body.preferences === "string" ? body.preferences : undefined;
  } catch {
    // Empty body is valid — cron caller may send no body
  }

  if (preferences && preferences.length > MAX_PREFERENCES_LENGTH) {
    return NextResponse.json(
      {
        error: `Preferences too long. Maximum ${MAX_PREFERENCES_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  // 3. Fetch recipes
  let recipes: Recipe[];

  try {
    recipes = await getRecipeRepo().list();
  } catch (err) {
    console.error("Failed to fetch recipes:", err);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }

  // 4. Check minimum count
  if (recipes.length < 5) {
    return NextResponse.json(
      {
        error: `Not enough recipes. Found ${recipes.length}, need at least 5.`,
      },
      { status: 400 }
    );
  }

  // 5. If Gemini is not available, return a demo plan
  if (!isGeminiAvailable()) {
    const plan = generateDemoMealPlan(recipes);
    const stored = await getMealPlanRepo().save(plan);
    return NextResponse.json({
      success: true,
      plan: stored,
      demo: true,
    });
  }

  // 6. Calculate weekOf
  const weekOf = getNextMonday();

  // 7. Build prompt
  const recipesText = formatRecipesForPrompt(recipes);
  const preferencesText = preferences || "No specific dietary restrictions";
  const userMessage = `Recipes available:\n${recipesText}\n\nDietary preferences: ${preferencesText}\n\nSelect 5 dinners for the week of ${weekOf} and generate the grocery list.`;

  // 8. Call Gemini
  let response;
  try {
    response = await getAI().models.generateContent({
      model: "gemini-2.0-flash",
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: MEAL_PLAN_SCHEMA,
      },
    });
  } catch (err) {
    console.error("Failed to generate meal plan:", err);
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }

  // 9. Parse + validate response
  const responseText = response.text;
  if (!responseText) {
    console.error("Failed to generate meal plan: empty response");
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }

  let plan: MealPlan;
  try {
    plan = JSON.parse(responseText) as MealPlan;
  } catch (err) {
    console.error("Failed to parse meal plan response:", err);
    return NextResponse.json(
      { error: "Failed to parse meal plan response" },
      { status: 500 }
    );
  }

  const recipeIds = new Set(recipes.map((r) => r.id));
  const validationError = validateMealPlan(plan, recipeIds);
  if (validationError) {
    console.error("Failed to generate a valid meal plan:", validationError);
    return NextResponse.json(
      { error: "Failed to generate a valid meal plan" },
      { status: 500 }
    );
  }

  // 10. Override weekOf with server-computed value
  plan.weekOf = weekOf;

  // 11. Persist plan
  const stored = await getMealPlanRepo().save(plan);

  // 12. Send email
  let emailSent = false;
  let emailError: string | undefined;

  try {
    const result = await sendMealPlanEmail(plan);
    emailSent = true;
    console.log("Meal plan email sent successfully:", result.emailId);
  } catch (err) {
    emailError = err instanceof Error ? err.message : "Failed to send email";
    console.error("Failed to send meal plan email:", err);
  }

  // 13. Return
  return NextResponse.json({
    success: true,
    plan: stored,
    emailSent,
    emailError,
  });
}
