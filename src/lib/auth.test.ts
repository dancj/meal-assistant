import { requireAuth } from "./auth";

function makeRequest(headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("requireAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns null when CRON_SECRET is not set", () => {
    delete process.env.CRON_SECRET;
    const result = requireAuth(makeRequest());
    expect(result).toBeNull();
  });

  it("returns null when CRON_SECRET is empty string", () => {
    process.env.CRON_SECRET = "";
    const result = requireAuth(makeRequest());
    expect(result).toBeNull();
  });

  it("returns null when valid Bearer token is provided", () => {
    process.env.CRON_SECRET = "my-secret";
    const result = requireAuth(
      makeRequest({ Authorization: "Bearer my-secret" })
    );
    expect(result).toBeNull();
  });

  it("returns 401 when Authorization header is missing", async () => {
    process.env.CRON_SECRET = "my-secret";
    const result = requireAuth(makeRequest());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when token is wrong", async () => {
    process.env.CRON_SECRET = "my-secret";
    const result = requireAuth(
      makeRequest({ Authorization: "Bearer wrong-token" })
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 when header has no Bearer prefix", async () => {
    process.env.CRON_SECRET = "my-secret";
    const result = requireAuth(
      makeRequest({ Authorization: "my-secret" })
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 when header is Basic scheme", async () => {
    process.env.CRON_SECRET = "my-secret";
    const result = requireAuth(
      makeRequest({ Authorization: "Basic my-secret" })
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
