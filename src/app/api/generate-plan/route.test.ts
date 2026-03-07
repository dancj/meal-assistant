import { POST } from "./route";
import { createSupabaseMock } from "@/test/helpers";

const supabaseMock = createSupabaseMock();

const { generateContentMock, sendMealPlanEmailMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  sendMealPlanEmailMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => supabaseMock.mock),
}));

vi.mock("@/lib/gemini", () => ({
  getAI: vi.fn(() => ({ models: { generateContent: generateContentMock } })),
}));

vi.mock("@/lib/email", () => ({
  sendMealPlanEmail: sendMealPlanEmailMock,
}));

const CRON_SECRET = "test-secret";

function makeRecipe(id: string, name: string) {
  return {
    id,
    name,
    ingredients: [{ name: "Ingredient", quantity: "1", unit: "cup" }],
    tags: ["dinner"],
    servings: 4,
    instructions: null,
    prep_time: null,
    cook_time: null,
    source_url: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const FIVE_RECIPES = [
  makeRecipe("id-1", "Pasta"),
  makeRecipe("id-2", "Tacos"),
  makeRecipe("id-3", "Stir Fry"),
  makeRecipe("id-4", "Soup"),
  makeRecipe("id-5", "Salad"),
];

function validMealPlanResponse() {
  return {
    dinners: [
      { day: "Monday", recipeName: "Pasta", recipeId: "id-1", servings: 4, alternativeNote: null },
      { day: "Tuesday", recipeName: "Tacos", recipeId: "id-2", servings: 4, alternativeNote: null },
      { day: "Wednesday", recipeName: "Stir Fry", recipeId: "id-3", servings: 4, alternativeNote: null },
      { day: "Thursday", recipeName: "Soup", recipeId: "id-4", servings: 4, alternativeNote: null },
      { day: "Friday", recipeName: "Salad", recipeId: "id-5", servings: 4, alternativeNote: null },
    ],
    groceryList: [
      { item: "Ingredient", quantity: "5 cups" },
    ],
    weekOf: "2026-02-24",
  };
}

function postRequest(body?: unknown, token = CRON_SECRET) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new Request("http://localhost/api/generate-plan", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function postRequestNoAuth(body?: unknown) {
  return new Request("http://localhost/api/generate-plan", {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/generate-plan", () => {
  beforeEach(() => {
    supabaseMock.reset();
    generateContentMock.mockReset();
    sendMealPlanEmailMock.mockReset();
    sendMealPlanEmailMock.mockResolvedValue({ emailId: "email-123" });
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("auth validation", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const response = await POST(postRequestNoAuth());
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when token is wrong", async () => {
      const response = await POST(postRequest(undefined, "wrong-secret"));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when Authorization header is not Bearer format", async () => {
      const request = new Request("http://localhost/api/generate-plan", {
        method: "POST",
        headers: { Authorization: `Basic ${CRON_SECRET}` },
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("body parsing", () => {
    it("accepts empty body (no preferences)", async () => {
      supabaseMock.resolveWith(FIVE_RECIPES);
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("accepts body with preferences", async () => {
      supabaseMock.resolveWith(FIVE_RECIPES);
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });

      const response = await POST(
        postRequest({ preferences: "No shellfish" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      const callArgs = generateContentMock.mock.calls[0][0];
      expect(callArgs.contents).toContain("No shellfish");
    });

    it("returns 400 when preferences exceed 500 characters", async () => {
      const response = await POST(
        postRequest({ preferences: "x".repeat(501) })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Preferences too long");
    });

    it("ignores non-string preferences", async () => {
      supabaseMock.resolveWith(FIVE_RECIPES);
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });

      const response = await POST(postRequest({ preferences: 123 }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      const callArgs = generateContentMock.mock.calls[0][0];
      expect(callArgs.contents).toContain(
        "No specific dietary restrictions"
      );
    });
  });

  describe("recipe fetching", () => {
    it("returns 500 on Supabase error", async () => {
      supabaseMock.resolveWith(null, { message: "Database error" });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to fetch recipes");
    });

    it("returns 400 when fewer than 5 recipes", async () => {
      supabaseMock.resolveWith([
        makeRecipe("id-1", "Pasta"),
        makeRecipe("id-2", "Tacos"),
      ]);

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Not enough recipes");
      expect(body.error).toContain("Found 2");
    });

    it("returns 400 when recipes is null", async () => {
      supabaseMock.resolveWith(null);

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Not enough recipes");
      expect(body.error).toContain("Found 0");
    });
  });

  describe("Gemini integration", () => {
    beforeEach(() => {
      supabaseMock.resolveWith(FIVE_RECIPES);
    });

    it("returns 200 with valid meal plan", async () => {
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.plan.dinners).toHaveLength(5);
      expect(body.plan.groceryList).toHaveLength(1);
    });

    it("calls Gemini with correct model and config", async () => {
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });

      await POST(postRequest());

      expect(generateContentMock).toHaveBeenCalledOnce();
      const callArgs = generateContentMock.mock.calls[0][0];
      expect(callArgs.model).toBe("gemini-2.0-flash");
      expect(callArgs.config.responseMimeType).toBe("application/json");
      expect(callArgs.config.responseSchema).toBeDefined();
      expect(callArgs.config.systemInstruction).toContain(
        "meal planning assistant"
      );
    });

    it("includes recipe IDs in the prompt", async () => {
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });

      await POST(postRequest());

      const callArgs = generateContentMock.mock.calls[0][0];
      expect(callArgs.contents).toContain("ID: id-1");
      expect(callArgs.contents).toContain("Name: Pasta");
    });

    it("overrides weekOf with server-computed value", async () => {
      const planWithWrongDate = validMealPlanResponse();
      planWithWrongDate.weekOf = "1999-01-01";
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(planWithWrongDate),
      });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.plan.weekOf).not.toBe("1999-01-01");
      // Should be a valid date string
      expect(body.plan.weekOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns 500 when Gemini call throws", async () => {
      generateContentMock.mockRejectedValue(new Error("API error"));

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate meal plan");
    });

    it("returns 500 when response text is empty", async () => {
      generateContentMock.mockResolvedValue({ text: "" });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate meal plan");
    });

    it("returns 500 when response text is undefined", async () => {
      generateContentMock.mockResolvedValue({ text: undefined });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate meal plan");
    });

    it("returns 500 when response is not valid JSON", async () => {
      generateContentMock.mockResolvedValue({ text: "not json" });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to parse meal plan response");
    });
  });

  describe("post-generation validation", () => {
    beforeEach(() => {
      supabaseMock.resolveWith(FIVE_RECIPES);
    });

    it("returns 500 when dinners count is not 5", async () => {
      const plan = validMealPlanResponse();
      plan.dinners = plan.dinners.slice(0, 3);
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(plan),
      });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate a valid meal plan");
    });

    it("returns 500 when recipeId does not exist in recipe set", async () => {
      const plan = validMealPlanResponse();
      plan.dinners[0].recipeId = "non-existent-id";
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(plan),
      });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate a valid meal plan");
    });

    it("returns 500 when duplicate recipeIds are present", async () => {
      const plan = validMealPlanResponse();
      plan.dinners[4].recipeId = "id-1"; // duplicate of dinners[0]
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(plan),
      });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate a valid meal plan");
    });
  });

  describe("email delivery", () => {
    beforeEach(() => {
      supabaseMock.resolveWith(FIVE_RECIPES);
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(validMealPlanResponse()),
      });
    });

    it("returns 200 with emailSent: true on email success", async () => {
      sendMealPlanEmailMock.mockResolvedValue({ emailId: "email-456" });

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.emailSent).toBe(true);
      expect(body.plan.dinners).toHaveLength(5);
    });

    it("returns 200 with emailSent: false on email failure", async () => {
      sendMealPlanEmailMock.mockRejectedValue(new Error("Resend API down"));

      const response = await POST(postRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.emailSent).toBe(false);
      expect(body.emailError).toBe("Resend API down");
      expect(body.plan.dinners).toHaveLength(5);
    });

    it("includes plan in response even when email fails", async () => {
      sendMealPlanEmailMock.mockRejectedValue(new Error("fail"));

      const response = await POST(postRequest());
      const body = await response.json();

      expect(body.plan).toBeDefined();
      expect(body.plan.groceryList).toHaveLength(1);
    });
  });
});
