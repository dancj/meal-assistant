import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { Deal } from "@/lib/deals/types";
import type { Recipe } from "@/lib/recipes/types";
import type { GeneratePlanInput, MealLog } from "./types";
import { REQUIRED_MEAL_COUNT } from "./types";

const STORE_PRIORITY_BLOCK = `Available stores:
- Aldi (everyday staples, produce — check first)
- Safeway (weekly sales — this week's deals provided)
- Costco (bulk proteins/staples when buying in quantity)
- Wegmans via Instacart (specialty ingredients)

For each grocery list item, assign the most cost-effective store.
Group the final grocery list by store.
Heuristics: bulk proteins ≥ 2 lb → Costco; specialty/uncommon → Wegmans; items in this week's Aldi/Safeway deals → that store; otherwise default to Aldi.`;

const OUTPUT_SCHEMA = `interface MealPlan {
  meals: {
    title: string;
    kidVersion: string | null;
    dealMatches: { item: string; salePrice: string; store: string }[];
  }[];
  groceryList: {
    item: string;
    quantity: string;
    store: 'aldi' | 'safeway' | 'costco' | 'wegmans';
    dealMatch: { salePrice: string; validTo: string } | null;
  }[];
}`;

export function buildSystemPrompt(): string {
  return [
    "You are a meal-planning assistant for a single household.",
    `Your task: pick exactly ${REQUIRED_MEAL_COUNT} dinners from the provided recipe library for the upcoming week, then build a single grouped grocery list covering them.`,
    "",
    "Picking rules:",
    "- Prefer recipes whose main ingredients overlap with this week's deals.",
    "- Avoid recipes whose titles appear in the recent meal logs (avoid repeats).",
    "- For every chosen recipe whose source has a kid version available, include the kid modification on the meal.",
    "- Honor any user preferences provided.",
    "",
    "Grocery-list rules:",
    "- Combine ingredient quantities across the chosen meals.",
    "- Do NOT include any item that matches a pantry entry (case-insensitive).",
    "- Assign each item a store using the priority block below.",
    "- For each item that matches a deal in this week's deals, populate dealMatch with that deal's salePrice and validTo.",
    "",
    STORE_PRIORITY_BLOCK,
    "",
    "Output format:",
    "Respond with ONLY a JSON object matching this exact TypeScript interface. No prose. No markdown code fences. No comments. No trailing text.",
    "",
    OUTPUT_SCHEMA,
  ].join("\n");
}

interface CompactRecipe {
  title: string;
  tags: string[];
  hasKidVersion: boolean;
}

export function compactRecipes(recipes: Recipe[]): CompactRecipe[] {
  return recipes.map((r) => ({
    title: r.title,
    tags: r.tags,
    hasKidVersion: r.kidVersion !== null,
  }));
}

export function groupDealsByStore(deals: Deal[]): Record<string, Deal[]> {
  const grouped: Record<string, Deal[]> = {};
  for (const deal of deals) {
    const bucket = grouped[deal.store] ?? [];
    bucket.push(deal);
    grouped[deal.store] = bucket;
  }
  return grouped;
}

export interface BuiltPrompt {
  system: string;
  messages: MessageCreateParamsNonStreaming["messages"];
}

export function buildUserMessage(
  input: GeneratePlanInput,
): MessageCreateParamsNonStreaming["messages"] {
  const recipeBlock =
    "RECIPE LIBRARY (stable across this week):\n" +
    JSON.stringify(compactRecipes(input.recipes));

  const otherSections: string[] = [
    "THIS WEEK'S DEALS:\n" + JSON.stringify(groupDealsByStore(input.deals)),
    "RECENT MEAL LOGS (avoid repeats):\n" + JSON.stringify(input.logs satisfies MealLog[]),
    "PANTRY (omit from grocery list):\n" + JSON.stringify(input.pantry),
  ];

  const trimmedPreferences = input.preferences?.trim() ?? "";
  if (trimmedPreferences !== "") {
    otherSections.push("USER PREFERENCES:\n" + trimmedPreferences);
  }

  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: recipeBlock,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: otherSections.join("\n\n"),
        },
      ],
    },
  ];
}

export function buildPrompt(input: GeneratePlanInput): BuiltPrompt {
  return {
    system: buildSystemPrompt(),
    messages: buildUserMessage(input),
  };
}
