import { GET } from "./route";

describe("GET /api/preferences/default", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns the DIETARY_PREFERENCES env var value", async () => {
    process.env.DIETARY_PREFERENCES = "No shellfish. Kid: vegetarian alternative.";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences).toBe("No shellfish. Kid: vegetarian alternative.");
  });

  it("returns empty string when DIETARY_PREFERENCES is not set", async () => {
    delete process.env.DIETARY_PREFERENCES;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences).toBe("");
  });
});
