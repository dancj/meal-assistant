import { GET, PUT, DELETE } from "./route";

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

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_UUID = "not-a-uuid";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/recipes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID", async () => {
    const response = await GET(
      new Request("http://localhost"),
      params(INVALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid recipe ID format");
  });

  it("returns 200 with recipe", async () => {
    const recipe = { id: VALID_UUID, name: "Pasta" };
    mockRecipeRepo.getById.mockResolvedValue(recipe);

    const response = await GET(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(recipe);
  });

  it("returns 404 when not found", async () => {
    mockRecipeRepo.getById.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 500 on storage error", async () => {
    mockRecipeRepo.getById.mockRejectedValue(new Error("db error"));

    const response = await GET(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch recipe");
  });
});

describe("PUT /api/recipes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function putRequest(body: unknown) {
    return new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("returns 400 for invalid UUID", async () => {
    const response = await PUT(
      putRequest({ name: "Pasta", ingredients: [{ name: "Noodles" }] }),
      params(INVALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid recipe ID format");
  });

  it("returns 200 with updated recipe", async () => {
    const updated = { id: VALID_UUID, name: "Updated Pasta" };
    mockRecipeRepo.update.mockResolvedValue(updated);

    const response = await PUT(
      putRequest({
        name: "Updated Pasta",
        ingredients: [{ name: "Noodles" }],
      }),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(updated);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await PUT(putRequest("not json"), params(VALID_UUID));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 when validation fails", async () => {
    const response = await PUT(
      putRequest({ name: "", ingredients: [{ name: "Noodles" }] }),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("name is required");
  });

  it("strips unknown fields", async () => {
    mockRecipeRepo.update.mockResolvedValue({ id: VALID_UUID, name: "Pasta" });

    await PUT(
      putRequest({
        name: "Pasta",
        ingredients: [{ name: "Noodles" }],
        hack: "evil",
      }),
      params(VALID_UUID)
    );

    const updateArg = mockRecipeRepo.update.mock.calls[0][1];
    expect(updateArg).not.toHaveProperty("hack");
    expect(updateArg).toHaveProperty("name", "Pasta");
  });

  it("returns 404 when not found", async () => {
    mockRecipeRepo.update.mockResolvedValue(null);

    const response = await PUT(
      putRequest({ name: "Pasta", ingredients: [{ name: "Noodles" }] }),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 500 on storage error", async () => {
    mockRecipeRepo.update.mockRejectedValue(new Error("db error"));

    const response = await PUT(
      putRequest({ name: "Pasta", ingredients: [{ name: "Noodles" }] }),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to update recipe");
  });
});

describe("DELETE /api/recipes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID", async () => {
    const response = await DELETE(
      new Request("http://localhost"),
      params(INVALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid recipe ID format");
  });

  it("returns 204 on success", async () => {
    mockRecipeRepo.delete.mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns 404 when not found", async () => {
    mockRecipeRepo.delete.mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 500 on storage error", async () => {
    mockRecipeRepo.delete.mockRejectedValue(new Error("db error"));

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to delete recipe");
  });
});
