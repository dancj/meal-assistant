import { GET, PUT, DELETE } from "./route";
import { createSupabaseMock } from "@/test/helpers";

const supabaseMock = createSupabaseMock();

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => supabaseMock.mock),
}));

vi.mock("@/lib/demo-mode", () => ({
  isDemoMode: vi.fn(() => false),
  demoStore: {},
}));

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_UUID = "not-a-uuid";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/recipes/[id]", () => {
  beforeEach(() => {
    supabaseMock.reset();
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
    supabaseMock.resolveWith(recipe);

    const response = await GET(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(recipe);
    expect(supabaseMock.mock.eq).toHaveBeenCalledWith("id", VALID_UUID);
  });

  it("returns 404 when not found (PGRST116)", async () => {
    supabaseMock.resolveWith(null, {
      code: "PGRST116",
      message: "not found",
    });

    const response = await GET(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 500 on other errors", async () => {
    supabaseMock.resolveWith(null, { code: "OTHER", message: "db error" });

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
    supabaseMock.reset();
    vi.useRealTimers();
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
    supabaseMock.resolveWith(updated);

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

  it("sets updated_at in update payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

    supabaseMock.resolveWith({ id: VALID_UUID, name: "Pasta" });

    await PUT(
      putRequest({ name: "Pasta", ingredients: [{ name: "Noodles" }] }),
      params(VALID_UUID)
    );

    expect(supabaseMock.mock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_at: "2026-01-15T12:00:00.000Z",
      })
    );

    vi.useRealTimers();
  });

  it("strips unknown fields", async () => {
    supabaseMock.resolveWith({ id: VALID_UUID, name: "Pasta" });

    await PUT(
      putRequest({
        name: "Pasta",
        ingredients: [{ name: "Noodles" }],
        hack: "evil",
      }),
      params(VALID_UUID)
    );

    const updateArg = supabaseMock.mock.update.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty("hack");
    expect(updateArg).toHaveProperty("name", "Pasta");
  });

  it("returns 404 when not found (PGRST116)", async () => {
    supabaseMock.resolveWith(null, {
      code: "PGRST116",
      message: "not found",
    });

    const response = await PUT(
      putRequest({ name: "Pasta", ingredients: [{ name: "Noodles" }] }),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 500 on other errors", async () => {
    supabaseMock.resolveWith(null, { code: "OTHER", message: "db error" });

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
    supabaseMock.reset();
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
    supabaseMock.resolveWith({ id: VALID_UUID, name: "Pasta" });

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns 404 when not found (PGRST116)", async () => {
    supabaseMock.resolveWith(null, {
      code: "PGRST116",
      message: "not found",
    });

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 404 when data is null", async () => {
    supabaseMock.resolveWith(null);

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Recipe not found");
  });

  it("returns 500 on other errors", async () => {
    supabaseMock.resolveWith(null, { code: "OTHER", message: "db error" });

    const response = await DELETE(
      new Request("http://localhost"),
      params(VALID_UUID)
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to delete recipe");
  });
});
