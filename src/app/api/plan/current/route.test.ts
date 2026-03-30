import { GET } from "./route";

const mockMealPlanRepo = {
  save: vi.fn(),
  getCurrent: vi.fn(),
  list: vi.fn(),
};

vi.mock("@/lib/storage", () => ({
  getMealPlanRepo: () => mockMealPlanRepo,
}));

const CRON_SECRET = "test-secret";

function getRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new Request("http://localhost/api/plan/current", { headers });
}

describe("GET /api/plan/current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when auth header is missing", async () => {
    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when token is wrong", async () => {
    const response = await GET(getRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("skips auth when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    mockMealPlanRepo.getCurrent.mockResolvedValue(null);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("No meal plan found");
  });

  it("returns 200 with current plan", async () => {
    const plan = {
      id: "plan-1",
      dinners: [{ day: "Monday", recipeName: "Pasta", recipeId: "r1", servings: 4, alternativeNote: null }],
      groceryList: [{ item: "Pasta", quantity: "1 lb" }],
      weekOf: "2026-03-30",
      created_at: "2026-03-30T00:00:00Z",
    };
    mockMealPlanRepo.getCurrent.mockResolvedValue(plan);

    const response = await GET(getRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(plan);
  });

  it("returns 404 when no plan exists", async () => {
    mockMealPlanRepo.getCurrent.mockResolvedValue(null);

    const response = await GET(getRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("No meal plan found");
  });

  it("returns 500 on storage error", async () => {
    mockMealPlanRepo.getCurrent.mockRejectedValue(new Error("db error"));

    const response = await GET(getRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch current meal plan");
  });
});
