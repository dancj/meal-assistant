import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Routes pull env from process.env at request time, so we mutate it per-test
// rather than module-mocking. External services would error if reached, so a
// failing fetch mock acts as a tripwire that demo mode short-circuits.
const fetchSpy = vi.fn(async () => {
  throw new Error("network access not allowed in demo-mode tests");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DEMO_MODE;
});

describe("GET /api/recipes (demo mode)", () => {
  it("returns DEMO_RECIPES with X-Demo-Mode header and no fetch calls", async () => {
    process.env.DEMO_MODE = "1";
    const { GET } = await import("./recipes/route");
    const { DEMO_RECIPES } = await import("@/lib/demo/fixtures");

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    expect(await res.json()).toEqual(DEMO_RECIPES);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("GET /api/deals (demo mode)", () => {
  it("returns DEMO_DEALS with X-Demo-Mode + X-Deals-Source: demo", async () => {
    process.env.DEMO_MODE = "1";
    const { GET } = await import("./deals/route");
    const { DEMO_DEALS } = await import("@/lib/demo/fixtures");

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    expect(res.headers.get("X-Deals-Source")).toBe("demo");
    expect(await res.json()).toEqual(DEMO_DEALS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/generate-plan (demo mode)", () => {
  it("returns a rotated demo plan with X-Demo-Mode and skips Anthropic", async () => {
    process.env.DEMO_MODE = "1";
    const { POST } = await import("./generate-plan/route");
    const { DEMO_PLAN } = await import("@/lib/demo/fixtures");

    const request = new Request("http://localhost/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipes: [],
        deals: [],
        logs: [],
        pantry: { staples: [], freezer: [] },
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    const body = (await res.json()) as { meals: { title: string }[] };
    const titles = body.meals.map((m) => m.title).sort();
    const expected = DEMO_PLAN.meals.map((m) => m.title).sort();
    expect(titles).toEqual(expected);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still rejects malformed input even in demo mode (validation runs first)", async () => {
    process.env.DEMO_MODE = "1";
    const { POST } = await import("./generate-plan/route");

    const request = new Request("http://localhost/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/email (demo mode)", () => {
  it("returns a fake-success with X-Demo-Mode and skips Resend", async () => {
    process.env.DEMO_MODE = "1";
    const { POST } = await import("./email/route");
    const { DEMO_PLAN } = await import("@/lib/demo/fixtures");

    const request = new Request("http://localhost/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_PLAN),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    const body = (await res.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    expect(body.id).toBe("demo-email-id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still rejects malformed input even in demo mode (validation runs first)", async () => {
    process.env.DEMO_MODE = "1";
    const { POST } = await import("./email/route");

    const request = new Request("http://localhost/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
  });
});
