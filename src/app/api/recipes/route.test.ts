import { GET, POST } from "./route";

const mockRecipeRepo = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
};

vi.mock("@/lib/storage", () => ({
  getRecipeRepo: () => mockRecipeRepo,
}));

function getRequest(url = "http://localhost/api/recipes"): Request {
  return new Request(url);
}

describe("GET /api/recipes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 200 with recipe array", async () => {
    const recipes = [
      { id: "1", name: "Pasta" },
      { id: "2", name: "Salad" },
    ];
    mockRecipeRepo.list.mockResolvedValue(recipes);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(recipes);
  });

  it("returns 200 with empty array when no recipes", async () => {
    mockRecipeRepo.list.mockResolvedValue([]);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns 500 on storage error", async () => {
    mockRecipeRepo.list.mockRejectedValue(new Error("Database error"));

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch recipes");
  });

  it("returns 401 when CRON_SECRET is set and no token provided", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("returns 200 when CRON_SECRET is set and valid token provided", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockRecipeRepo.list.mockResolvedValue([]);
    const response = await GET(
      new Request("http://localhost/api/recipes", {
        headers: { Authorization: "Bearer test-secret" },
      })
    );
    expect(response.status).toBe(200);
  });

  it("calls search with q param", async () => {
    const recipes = [{ id: "1", name: "Chicken Pasta" }];
    mockRecipeRepo.search.mockResolvedValue(recipes);

    const response = await GET(
      getRequest("http://localhost/api/recipes?q=chicken")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(recipes);
    expect(mockRecipeRepo.search).toHaveBeenCalledWith({
      q: "chicken",
      tag: undefined,
    });
    expect(mockRecipeRepo.list).not.toHaveBeenCalled();
  });

  it("calls search with tag param", async () => {
    mockRecipeRepo.search.mockResolvedValue([]);

    const response = await GET(
      getRequest("http://localhost/api/recipes?tag=dinner")
    );

    expect(response.status).toBe(200);
    expect(mockRecipeRepo.search).toHaveBeenCalledWith({
      q: undefined,
      tag: "dinner",
    });
  });

  it("calls search with both q and tag", async () => {
    mockRecipeRepo.search.mockResolvedValue([]);

    const response = await GET(
      getRequest("http://localhost/api/recipes?q=pasta&tag=quick")
    );

    expect(response.status).toBe(200);
    expect(mockRecipeRepo.search).toHaveBeenCalledWith({
      q: "pasta",
      tag: "quick",
    });
  });

  it("calls list when q is empty string", async () => {
    mockRecipeRepo.list.mockResolvedValue([]);

    const response = await GET(
      getRequest("http://localhost/api/recipes?q=")
    );

    expect(response.status).toBe(200);
    expect(mockRecipeRepo.list).toHaveBeenCalled();
    expect(mockRecipeRepo.search).not.toHaveBeenCalled();
  });

  it("returns empty array for no search results", async () => {
    mockRecipeRepo.search.mockResolvedValue([]);

    const response = await GET(
      getRequest("http://localhost/api/recipes?q=nonexistent")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });
});

describe("POST /api/recipes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function postRequest(body: unknown) {
    return new Request("http://localhost/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("returns 201 with created recipe", async () => {
    const recipe = {
      id: "abc-123",
      name: "Pasta",
      ingredients: [{ name: "Noodles", quantity: "200", unit: "g" }],
    };
    mockRecipeRepo.create.mockResolvedValue(recipe);

    const response = await POST(
      postRequest({
        name: "Pasta",
        ingredients: [{ name: "Noodles", quantity: "200", unit: "g" }],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(recipe);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(postRequest("not json"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(
      postRequest({ ingredients: [{ name: "Noodles" }] })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("name is required");
  });

  it("returns 400 when name is empty", async () => {
    const response = await POST(
      postRequest({ name: "  ", ingredients: [{ name: "Noodles" }] })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("name is required");
  });

  it("returns 400 when ingredients is missing", async () => {
    const response = await POST(postRequest({ name: "Pasta" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("ingredients is required");
  });

  it("returns 400 when ingredients is empty array", async () => {
    const response = await POST(
      postRequest({ name: "Pasta", ingredients: [] })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("ingredients is required");
  });

  it("returns 400 when ingredient name is missing", async () => {
    const response = await POST(
      postRequest({ name: "Pasta", ingredients: [{ quantity: "200g" }] })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("ingredients[0].name is required");
  });

  it("strips unknown fields before create", async () => {
    mockRecipeRepo.create.mockResolvedValue({
      id: "abc",
      name: "Pasta",
      ingredients: [{ name: "Noodles" }],
    });

    await POST(
      postRequest({
        name: "Pasta",
        ingredients: [{ name: "Noodles" }],
        unknown_field: "should be stripped",
        another: 123,
      })
    );

    expect(mockRecipeRepo.create).toHaveBeenCalledWith({
      name: "Pasta",
      ingredients: [{ name: "Noodles" }],
    });
  });

  it("returns 500 on storage error", async () => {
    mockRecipeRepo.create.mockRejectedValue(new Error("Insert failed"));

    const response = await POST(
      postRequest({
        name: "Pasta",
        ingredients: [{ name: "Noodles" }],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to create recipe");
  });

  it("returns 401 when CRON_SECRET is set and no token provided", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await POST(
      postRequest({ name: "Pasta", ingredients: [{ name: "Noodles" }] })
    );
    expect(response.status).toBe(401);
  });
});
