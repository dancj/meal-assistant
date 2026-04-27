import { describe, expect, it } from "vitest";
import type { MealPlan } from "@/lib/plan/types";
import { formatMealPlanEmail } from "./format";

function makePlan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    meals: [
      {
        title: "Sheet-pan chicken",
        kidVersion: "plain chicken",
        dealMatches: [
          { item: "chicken thighs", salePrice: "$1.99/lb", store: "Safeway" },
        ],
      },
      { title: "Black bean tacos", kidVersion: null, dealMatches: [] },
      { title: "Salmon with rice", kidVersion: null, dealMatches: [] },
      { title: "Turkey chili", kidVersion: null, dealMatches: [] },
      { title: "Sausage skillet", kidVersion: null, dealMatches: [] },
    ],
    groceryList: [
      {
        item: "Chicken thighs",
        quantity: "2 lb",
        store: "safeway",
        dealMatch: { salePrice: "$1.99/lb", validTo: "2026-04-29" },
      },
      { item: "Black beans", quantity: "3 cans", store: "aldi", dealMatch: null },
      { item: "Avocados", quantity: "4", store: "costco", dealMatch: null },
      { item: "Honey", quantity: "12 oz", store: "wegmans", dealMatch: null },
    ],
    ...overrides,
  };
}

describe("formatMealPlanEmail — subject", () => {
  it("includes a human-formatted week label", () => {
    const { subject } = formatMealPlanEmail(makePlan(), "2026-04-27");
    expect(subject).toMatch(/April 27, 2026/);
    expect(subject).toMatch(/meal plan/i);
  });

  it("formats different weeks correctly", () => {
    expect(formatMealPlanEmail(makePlan(), "2026-01-05").subject).toMatch(
      /January 5, 2026/,
    );
    expect(formatMealPlanEmail(makePlan(), "2026-12-28").subject).toMatch(
      /December 28, 2026/,
    );
  });
});

describe("formatMealPlanEmail — html structure", () => {
  it("contains every meal title", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    for (const meal of makePlan().meals) {
      expect(html).toContain(meal.title);
    }
  });

  it("contains every grocery item", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    for (const item of makePlan().groceryList) {
      expect(html).toContain(item.item);
    }
  });

  it("groups grocery items by store in canonical order (aldi, safeway, costco, wegmans)", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    const grocerySection = html.slice(html.indexOf("Grocery list"));
    const aldiPos = grocerySection.indexOf("Aldi");
    const safewayPos = grocerySection.indexOf("Safeway");
    const costcoPos = grocerySection.indexOf("Costco");
    const wegmansPos = grocerySection.indexOf("Wegmans");
    expect(aldiPos).toBeGreaterThan(-1);
    expect(safewayPos).toBeGreaterThan(aldiPos);
    expect(costcoPos).toBeGreaterThan(safewayPos);
    expect(wegmansPos).toBeGreaterThan(costcoPos);
  });

  it("renders kidVersion when non-null", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    expect(html).toContain("plain chicken");
  });

  it("omits the kidVersion line when null (no empty parens or stray label)", () => {
    const plan = makePlan({
      meals: [
        { title: "M1", kidVersion: null, dealMatches: [] },
        { title: "M2", kidVersion: null, dealMatches: [] },
        { title: "M3", kidVersion: null, dealMatches: [] },
        { title: "M4", kidVersion: null, dealMatches: [] },
        { title: "M5", kidVersion: null, dealMatches: [] },
      ],
    });
    const { html } = formatMealPlanEmail(plan, "2026-04-27");
    expect(html).not.toContain("Kid version: null");
    expect(html).not.toContain("kidVersion");
  });

  it("renders dealMatches when present", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    expect(html).toContain("$1.99/lb");
  });

  it("uses inline-styled mobile layout (max-width 600px)", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    expect(html).toMatch(/max-width:\s*600px/);
  });

  it("does not include a <style> tag (inline styles only)", () => {
    const { html } = formatMealPlanEmail(makePlan(), "2026-04-27");
    expect(html).not.toMatch(/<style[\s>]/i);
  });
});

describe("formatMealPlanEmail — html escaping", () => {
  it("escapes <script> tags in meal titles", () => {
    const plan = makePlan({
      meals: [
        {
          title: "<script>alert(1)</script>",
          kidVersion: null,
          dealMatches: [],
        },
        { title: "M2", kidVersion: null, dealMatches: [] },
        { title: "M3", kidVersion: null, dealMatches: [] },
        { title: "M4", kidVersion: null, dealMatches: [] },
        { title: "M5", kidVersion: null, dealMatches: [] },
      ],
    });
    const { html } = formatMealPlanEmail(plan, "2026-04-27");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  it("escapes ampersands, quotes, and apostrophes", () => {
    const plan = makePlan({
      groceryList: [
        {
          item: `Tom's "Best" & Co.`,
          quantity: "1",
          store: "aldi",
          dealMatch: null,
        },
      ],
    });
    const { html } = formatMealPlanEmail(plan, "2026-04-27");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");
    expect(html).not.toContain(`Tom's "Best" & Co.`);
  });
});

describe("formatMealPlanEmail — text fallback", () => {
  it("contains every meal title and grocery item", () => {
    const { text } = formatMealPlanEmail(makePlan(), "2026-04-27");
    for (const meal of makePlan().meals) {
      expect(text).toContain(meal.title);
    }
    for (const item of makePlan().groceryList) {
      expect(text).toContain(item.item);
    }
  });

  it("contains no HTML tags", () => {
    const { text } = formatMealPlanEmail(makePlan(), "2026-04-27");
    expect(text).not.toMatch(/<\/?[a-z][^>]*>/i);
  });

  it("does not HTML-escape entities (text is plain)", () => {
    const plan = makePlan({
      groceryList: [
        {
          item: `Tom's "Best" & Co.`,
          quantity: "1",
          store: "aldi",
          dealMatch: null,
        },
      ],
    });
    const { text } = formatMealPlanEmail(plan, "2026-04-27");
    expect(text).toContain(`Tom's "Best" & Co.`);
    expect(text).not.toContain("&amp;");
  });
});

describe("formatMealPlanEmail — edge cases", () => {
  it("renders with an empty grocery list without crashing", () => {
    const plan = makePlan({ groceryList: [] });
    const { html, text } = formatMealPlanEmail(plan, "2026-04-27");
    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
  });
});
