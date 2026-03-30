import { GET, POST } from "./route";

const mockRecipeRepo = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/storage", () => ({
  getRecipeRepo: () => mockRecipeRepo,
}));

describe("GET /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with recipe array", async () => {
    const recipes = [
      { id: "1", name: "Pasta" },
      { id: "2", name: "Salad" },
    ];
    mockRecipeRepo.list.mockResolvedValue(recipes);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(recipes);
  });

  it("returns 200 with empty array when no recipes", async () => {
    mockRecipeRepo.list.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns 500 on storage error", async () => {
    mockRecipeRepo.list.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch recipes");
  });
});

describe("POST /api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
