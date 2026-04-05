import { GET } from "./route";

const mockMealPlanRepo = {
  save: vi.fn(),
  getCurrent: vi.fn(),
  list: vi.fn(),
};

vi.mock("@/lib/storage", () => ({
  getMealPlanRepo: () => mockMealPlanRepo,
}));

const originalEnv = process.env;

afterAll(() => {
  process.env = originalEnv;
});

describe("GET /api/plans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with array of plans", async () => {
    const plans = [
      { id: "1", weekOf: "2026-04-07", dinners: [], groceryList: [], created_at: "2026-04-05" },
      { id: "2", weekOf: "2026-03-31", dinners: [], groceryList: [], created_at: "2026-03-29" },
    ];
    mockMealPlanRepo.list.mockResolvedValue(plans);

    const response = await GET(new Request("http://localhost/api/plans"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(plans);
    expect(mockMealPlanRepo.list).toHaveBeenCalledWith(10);
  });

  it("returns 200 with empty array when no plans exist", async () => {
    mockMealPlanRepo.list.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/plans"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("passes limit query param to repository", async () => {
    mockMealPlanRepo.list.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/plans?limit=5"));

    expect(mockMealPlanRepo.list).toHaveBeenCalledWith(5);
  });

  it("clamps limit to max 50", async () => {
    mockMealPlanRepo.list.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/plans?limit=100"));

    expect(mockMealPlanRepo.list).toHaveBeenCalledWith(50);
  });

  it("returns 401 when CRON_SECRET is set and no token provided", async () => {
    process.env.CRON_SECRET = "test-secret";

    const response = await GET(new Request("http://localhost/api/plans"));

    expect(response.status).toBe(401);
  });

  it("returns 200 when CRON_SECRET is set and valid token provided", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockMealPlanRepo.list.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/plans", {
        headers: { Authorization: "Bearer test-secret" },
      })
    );

    expect(response.status).toBe(200);
  });

  it("returns 500 on storage error", async () => {
    mockMealPlanRepo.list.mockRejectedValue(new Error("db error"));

    const response = await GET(new Request("http://localhost/api/plans"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch plans");
  });
});
