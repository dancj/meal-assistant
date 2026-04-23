import { parseRecipients } from "./email";

// TODO #70: restore tests for formatMealPlanEmail and sendMealPlanEmail once
// the MealPlan shape is redefined. The old suites asserted against fields that
// no longer exist (weekOf, dinners[].recipeName, groceryList[].item) and were
// removed in the stack-strip refactor alongside src/types/meal-plan.ts.

describe("parseRecipients", () => {
  it("parses a single email", () => {
    expect(parseRecipients("alice@example.com")).toEqual(["alice@example.com"]);
  });

  it("parses multiple emails", () => {
    expect(parseRecipients("alice@example.com,bob@example.com")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("trims whitespace", () => {
    expect(parseRecipients("  alice@example.com , bob@example.com  ")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("filters empty entries", () => {
    expect(parseRecipients("alice@example.com,,bob@example.com,")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("throws on undefined", () => {
    expect(() => parseRecipients(undefined)).toThrow("EMAIL_RECIPIENTS");
  });

  it("throws on empty string", () => {
    expect(() => parseRecipients("")).toThrow("EMAIL_RECIPIENTS");
  });

  it("throws on whitespace-only string", () => {
    expect(() => parseRecipients("   ")).toThrow("EMAIL_RECIPIENTS");
  });
});
