import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/deals/types";
import type { Recipe } from "@/lib/recipes/types";
import {
  buildPrompt,
  buildSystemPrompt,
  buildUserMessage,
  compactRecipes,
  groupDealsByStore,
} from "./prompt";
import type { GeneratePlanInput } from "./types";

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    title: "Sheet-Pan Chicken",
    tags: ["weeknight"],
    kidVersion: null,
    content: "# body",
    filename: "sheet-pan-chicken.md",
    ...overrides,
  };
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    productName: "Chicken Thighs",
    brand: "Foster Farms",
    salePrice: "$1.99/lb",
    regularPrice: "$3.99/lb",
    promoType: "sale",
    validFrom: "2026-04-23",
    validTo: "2026-04-29",
    store: "safeway",
    ...overrides,
  };
}

function baseInput(overrides: Partial<GeneratePlanInput> = {}): GeneratePlanInput {
  return {
    recipes: [makeRecipe()],
    deals: [makeDeal()],
    logs: [],
    pantry: [],
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt();

  it("includes the verbatim store-priority block", () => {
    expect(prompt).toContain(
      "Aldi (everyday staples, produce — check first)",
    );
    expect(prompt).toContain("Safeway (weekly sales");
    expect(prompt).toContain("Costco (bulk proteins/staples");
    expect(prompt).toContain("Wegmans via Instacart");
  });

  it("includes the bulk-proteins / specialty / Aldi-default heuristics", () => {
    expect(prompt).toContain("bulk proteins ≥ 2 lb → Costco");
    expect(prompt).toContain("specialty/uncommon → Wegmans");
    expect(prompt).toContain("default to Aldi");
  });

  it("includes the MealPlan TypeScript interface", () => {
    expect(prompt).toContain("interface MealPlan");
    expect(prompt).toContain("kidVersion: string | null");
    expect(prompt).toContain(
      "store: 'aldi' | 'safeway' | 'costco' | 'wegmans'",
    );
  });

  it("instructs JSON-only output with no fences or prose", () => {
    expect(prompt).toMatch(/ONLY a JSON object/);
    expect(prompt).toMatch(/No markdown code fences/);
    expect(prompt).toMatch(/No prose/);
  });

  it("specifies exactly 5 dinners", () => {
    expect(prompt).toContain("exactly 5 dinners");
  });
});

describe("compactRecipes", () => {
  it("strips content and exposes hasKidVersion as a boolean", () => {
    const compact = compactRecipes([
      makeRecipe({ title: "A", tags: ["x"], kidVersion: "kid", content: "X" }),
      makeRecipe({ title: "B", tags: [], kidVersion: null, content: "Y" }),
    ]);
    expect(compact).toEqual([
      { title: "A", tags: ["x"], hasKidVersion: true },
      { title: "B", tags: [], hasKidVersion: false },
    ]);
  });
});

describe("groupDealsByStore", () => {
  it("groups deals by their store field", () => {
    const grouped = groupDealsByStore([
      makeDeal({ store: "safeway", productName: "A" }),
      makeDeal({ store: "aldi", productName: "B" }),
      makeDeal({ store: "safeway", productName: "C" }),
    ]);
    expect(grouped.safeway.map((d) => d.productName)).toEqual(["A", "C"]);
    expect(grouped.aldi.map((d) => d.productName)).toEqual(["B"]);
  });

  it("returns an empty object for no deals", () => {
    expect(groupDealsByStore([])).toEqual({});
  });
});

describe("buildUserMessage", () => {
  it("produces a two-block content array with cache_control on the recipe block", () => {
    const messages = buildUserMessage(baseInput());
    expect(messages).toHaveLength(1);
    const message = messages[0];
    expect(message.role).toBe("user");
    const content = message.content as Array<Record<string, unknown>>;
    expect(content).toHaveLength(2);
    expect(content[0]).toMatchObject({
      type: "text",
      cache_control: { type: "ephemeral" },
    });
    expect(content[0].text).toContain("RECIPE LIBRARY");
    expect(content[1]).toMatchObject({ type: "text" });
    expect(content[1]).not.toHaveProperty("cache_control");
  });

  it("compacts recipes in the recipe block — full content is omitted", () => {
    const messages = buildUserMessage(
      baseInput({
        recipes: [makeRecipe({ title: "Pad Thai", content: "SECRET BODY" })],
      }),
    );
    const recipeBlockText = (
      messages[0].content as Array<Record<string, unknown>>
    )[0].text as string;
    expect(recipeBlockText).toContain("Pad Thai");
    expect(recipeBlockText).toContain("hasKidVersion");
    expect(recipeBlockText).not.toContain("SECRET BODY");
  });

  it("includes empty arrays for empty logs and pantry rather than omitting sections", () => {
    const messages = buildUserMessage(baseInput({ logs: [], pantry: [] }));
    const otherText = (
      messages[0].content as Array<Record<string, unknown>>
    )[1].text as string;
    expect(otherText).toContain("RECENT MEAL LOGS");
    expect(otherText).toContain("PANTRY");
    expect(otherText).toContain("[]");
  });

  it("omits the preferences section when preferences is undefined", () => {
    const messages = buildUserMessage(baseInput());
    const otherText = (
      messages[0].content as Array<Record<string, unknown>>
    )[1].text as string;
    expect(otherText).not.toContain("USER PREFERENCES");
  });

  it("omits the preferences section when preferences is empty string", () => {
    const messages = buildUserMessage(baseInput({ preferences: "" }));
    const otherText = (
      messages[0].content as Array<Record<string, unknown>>
    )[1].text as string;
    expect(otherText).not.toContain("USER PREFERENCES");
  });

  it("omits the preferences section when preferences is whitespace-only", () => {
    const messages = buildUserMessage(baseInput({ preferences: "   " }));
    const otherText = (
      messages[0].content as Array<Record<string, unknown>>
    )[1].text as string;
    expect(otherText).not.toContain("USER PREFERENCES");
  });

  it("includes the preferences section when preferences is non-empty", () => {
    const messages = buildUserMessage(
      baseInput({ preferences: "no shellfish" }),
    );
    const otherText = (
      messages[0].content as Array<Record<string, unknown>>
    )[1].text as string;
    expect(otherText).toContain("USER PREFERENCES");
    expect(otherText).toContain("no shellfish");
  });

  it("does not crash when deals is empty", () => {
    const messages = buildUserMessage(baseInput({ deals: [] }));
    const otherText = (
      messages[0].content as Array<Record<string, unknown>>
    )[1].text as string;
    expect(otherText).toContain("THIS WEEK'S DEALS");
    expect(otherText).toContain("{}");
  });
});

describe("buildPrompt", () => {
  it("combines system + messages from the underlying builders", () => {
    const built = buildPrompt(baseInput());
    expect(built.system).toBe(buildSystemPrompt());
    expect(built.messages).toHaveLength(1);
  });
});
