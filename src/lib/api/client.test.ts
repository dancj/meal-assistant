import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  fetchDeals,
  fetchRecipes,
  generatePlan,
  sendEmail,
} from "./client";
import type { GeneratePlanInput, MealPlan } from "@/lib/plan/types";

const originalFetch = globalThis.fetch;

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchRecipes", () => {
  it("returns parsed JSON on 200", async () => {
    mockFetch(async () =>
      jsonResponse([
        {
          title: "Test",
          tags: [],
          kidVersion: null,
          content: "x",
          filename: "test.md",
        },
      ]),
    );
    const recipes = await fetchRecipes();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toBe("Test");
  });

  it("throws ApiError with status and endpoint on non-2xx", async () => {
    mockFetch(async () =>
      jsonResponse({ error: "GitHub auth failed (check GITHUB_PAT)" }, 502),
    );
    await expect(fetchRecipes()).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      endpoint: "/api/recipes",
    });
    await expect(fetchRecipes()).rejects.toThrow(/GitHub auth failed/);
  });

  it("throws ApiError mentioning the endpoint when fetch rejects", async () => {
    mockFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(fetchRecipes()).rejects.toThrow(/\/api\/recipes/);
    await expect(fetchRecipes()).rejects.toThrow(/network error/);
  });

  it("throws ApiError when 200 returns malformed JSON", async () => {
    mockFetch(
      async () =>
        new Response("not json{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(fetchRecipes()).rejects.toThrow(/invalid JSON/);
  });
});

describe("fetchDeals", () => {
  it("returns parsed JSON on 200", async () => {
    mockFetch(async () => jsonResponse([]));
    const deals = await fetchDeals();
    expect(Array.isArray(deals)).toBe(true);
  });

  it("throws ApiError on non-2xx", async () => {
    mockFetch(async () => jsonResponse({ error: "All deal sources failed" }, 502));
    await expect(fetchDeals()).rejects.toMatchObject({
      name: "ApiError",
      endpoint: "/api/deals",
    });
  });
});

describe("generatePlan", () => {
  const input: GeneratePlanInput = {
    recipes: [],
    deals: [],
    logs: [],
    pantry: [],
  };

  it("POSTs JSON with content-type and returns the parsed plan", async () => {
    let capturedInit: RequestInit | undefined;
    const mockPlan: MealPlan = { meals: [], groceryList: [] };
    mockFetch(async (_url, init) => {
      capturedInit = init;
      return jsonResponse(mockPlan);
    });
    await generatePlan(input);
    expect(capturedInit?.method).toBe("POST");
    expect(
      (capturedInit?.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(capturedInit?.body).toBe(JSON.stringify(input));
  });

  it("throws ApiError on non-2xx with the upstream message", async () => {
    mockFetch(async () =>
      jsonResponse({ error: "Anthropic upstream error", upstreamStatus: 529 }, 502),
    );
    await expect(generatePlan(input)).rejects.toBeInstanceOf(ApiError);
    await expect(generatePlan(input)).rejects.toThrow(/Anthropic upstream error/);
  });

  it("throws ApiError on network failure", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(generatePlan(input)).rejects.toThrow(/\/api\/generate-plan/);
    await expect(generatePlan(input)).rejects.toThrow(/network error/);
  });
});

describe("sendEmail", () => {
  const plan: MealPlan = { meals: [], groceryList: [] };

  it("POSTs the plan as JSON to /api/email and returns the parsed body", async () => {
    let capturedUrl: RequestInfo | URL | undefined;
    let capturedInit: RequestInit | undefined;
    mockFetch(async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return jsonResponse({ ok: true, id: "re_abc123" });
    });

    const result = await sendEmail(plan);

    expect(result).toEqual({ ok: true, id: "re_abc123" });
    expect(String(capturedUrl)).toBe("/api/email");
    expect(capturedInit?.method).toBe("POST");
    expect(
      (capturedInit?.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(capturedInit?.body).toBe(JSON.stringify(plan));
  });

  it("throws ApiError on non-2xx with the upstream detail", async () => {
    mockFetch(async () =>
      jsonResponse({ error: "Resend upstream error", detail: "domain unverified" }, 502),
    );
    await expect(sendEmail(plan)).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      endpoint: "/api/email",
    });
    await expect(sendEmail(plan)).rejects.toThrow(/Resend upstream error/);
  });

  it("throws ApiError on network failure", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(sendEmail(plan)).rejects.toThrow(/\/api\/email/);
    await expect(sendEmail(plan)).rejects.toThrow(/network error/);
  });
});
