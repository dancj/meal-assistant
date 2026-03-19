import { parseRecipients, formatMealPlanEmail, sendMealPlanEmail } from "./email";
import type { MealPlan } from "@/types/meal-plan";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

function samplePlan(): MealPlan {
  return {
    weekOf: "2026-02-23",
    dinners: [
      { day: "Monday", recipeName: "Pasta Carbonara", recipeId: "1", servings: 4, alternativeNote: null },
      { day: "Tuesday", recipeName: "Chicken Tacos", recipeId: "2", servings: 4, alternativeNote: "Kid alternative: plain quesadilla" },
      { day: "Wednesday", recipeName: "Stir Fry", recipeId: "3", servings: 4, alternativeNote: null },
      { day: "Thursday", recipeName: "Tomato Soup", recipeId: "4", servings: 4, alternativeNote: null },
      { day: "Friday", recipeName: "Fish & Chips", recipeId: "5", servings: 4, alternativeNote: null },
    ],
    groceryList: [
      { item: "Pasta", quantity: "1 lb" },
      { item: "Chicken breast", quantity: "2 lbs" },
    ],
  };
}

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

describe("formatMealPlanEmail", () => {
  it("returns subject, html, and text", () => {
    const result = formatMealPlanEmail(samplePlan());
    expect(result.subject).toContain("February 23, 2026");
    expect(result.html).toBeDefined();
    expect(result.text).toBeDefined();
  });

  it("includes all 5 dinner recipe names in HTML", () => {
    const { html } = formatMealPlanEmail(samplePlan());
    expect(html).toContain("Pasta Carbonara");
    expect(html).toContain("Chicken Tacos");
    expect(html).toContain("Stir Fry");
    expect(html).toContain("Tomato Soup");
    expect(html).toContain("Fish &amp; Chips");
  });

  it("includes grocery items in HTML", () => {
    const { html } = formatMealPlanEmail(samplePlan());
    expect(html).toContain("Pasta");
    expect(html).toContain("1 lb");
    expect(html).toContain("Chicken breast");
  });

  it("renders alternativeNote when present", () => {
    const { html } = formatMealPlanEmail(samplePlan());
    expect(html).toContain("Kid alternative: plain quesadilla");
  });

  it("omits alternativeNote markup when null", () => {
    const plan = samplePlan();
    plan.dinners = [plan.dinners[0]]; // Only Pasta Carbonara (no alt)
    const { html } = formatMealPlanEmail(plan);
    expect(html).not.toContain("font-style:italic");
  });

  it("escapes special characters in recipe names", () => {
    const plan = samplePlan();
    plan.dinners[0].recipeName = 'Mac & Cheese <"special">';
    const { html } = formatMealPlanEmail(plan);
    expect(html).toContain("Mac &amp; Cheese &lt;&quot;special&quot;&gt;");
  });

  it("includes same content in plain text without HTML", () => {
    const { text } = formatMealPlanEmail(samplePlan());
    expect(text).toContain("Pasta Carbonara");
    expect(text).toContain("Chicken Tacos");
    expect(text).toContain("Fish & Chips");
    expect(text).toContain("Pasta: 1 lb");
    expect(text).not.toContain("<div");
  });

  it("includes formatted date in subject", () => {
    const { subject } = formatMealPlanEmail(samplePlan());
    expect(subject).toBe("Your Meal Plan for the week of February 23, 2026");
  });
});

describe("sendMealPlanEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.stubEnv("EMAIL_FROM", "test@resend.dev");
    vi.stubEnv("EMAIL_RECIPIENTS", "alice@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends email and returns emailId on success", async () => {
    sendMock.mockResolvedValue({ data: { id: "email-123" }, error: null });

    const result = await sendMealPlanEmail(samplePlan());

    expect(result.emailId).toBe("email-123");
    expect(sendMock).toHaveBeenCalledOnce();
    const args = sendMock.mock.calls[0][0];
    expect(args.from).toBe("test@resend.dev");
    expect(args.to).toEqual(["alice@example.com"]);
    expect(args.subject).toContain("February 23, 2026");
    expect(args.html).toBeDefined();
    expect(args.text).toBeDefined();
  });

  it("throws on Resend return-value error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    await expect(sendMealPlanEmail(samplePlan())).rejects.toThrow(
      "Invalid API key"
    );
  });

  it("propagates Resend thrown exceptions", async () => {
    sendMock.mockRejectedValue(new Error("Network failure"));

    await expect(sendMealPlanEmail(samplePlan())).rejects.toThrow(
      "Network failure"
    );
  });

  it("throws when EMAIL_FROM is missing", async () => {
    vi.stubEnv("EMAIL_FROM", "");

    await expect(sendMealPlanEmail(samplePlan())).rejects.toThrow("EMAIL_FROM");
  });

  it("throws when EMAIL_RECIPIENTS is missing", async () => {
    vi.stubEnv("EMAIL_RECIPIENTS", "");

    await expect(sendMealPlanEmail(samplePlan())).rejects.toThrow(
      "EMAIL_RECIPIENTS"
    );
  });
});
