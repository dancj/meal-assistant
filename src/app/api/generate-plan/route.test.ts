import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnthropicNetworkError,
  AnthropicUpstreamError,
  InvalidRequestError,
  MalformedPlanError,
  MissingEnvVarError,
} from "@/lib/plan/errors";
import type { MealPlan } from "@/lib/plan/types";

const generatePlanMock = vi.fn();
const validateInputMock = vi.fn();

vi.mock("@/lib/plan/generate", () => ({
  generatePlan: (...args: unknown[]) => generatePlanMock(...args),
  validateInput: (...args: unknown[]) => validateInputMock(...args),
}));

import { POST } from "./route";

function makeRequest(body: unknown, init?: RequestInit): Request {
  const url = "http://localhost:3000/api/generate-plan";
  if (init !== undefined) {
    return new Request(url, init);
  }
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function emptyMealPlan(): MealPlan {
  return {
    meals: Array.from({ length: 5 }, (_, i) => ({
      title: `M${i + 1}`,
      kidVersion: null,
      dealMatches: [],
    })),
    groceryList: [],
  };
}

describe("POST /api/generate-plan", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    generatePlanMock.mockReset();
    validateInputMock.mockReset();
    validateInputMock.mockImplementation((b) => b);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns 200 + MealPlan on success", async () => {
    const plan = emptyMealPlan();
    generatePlanMock.mockResolvedValueOnce(plan);
    const res = await POST(
      makeRequest({
        recipes: [],
        deals: [],
        logs: [],
        pantry: [],
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(plan);
  });

  it("returns 400 when body is empty", async () => {
    const res = await POST(
      makeRequest("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "Request body must be valid JSON",
    });
  });

  it("returns 400 when body is not JSON", async () => {
    const res = await POST(
      makeRequest("not-json", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "hello",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 with field name when validateInput throws InvalidRequestError", async () => {
    validateInputMock.mockImplementationOnce(() => {
      throw new InvalidRequestError("recipes", "expected array");
    });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/recipes/);
  });

  it("returns 500 with var name when generatePlan throws MissingEnvVarError", async () => {
    generatePlanMock.mockRejectedValueOnce(
      new MissingEnvVarError("ANTHROPIC_API_KEY"),
    );
    const res = await POST(
      makeRequest({ recipes: [], deals: [], logs: [], pantry: [] }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns 502 with upstreamStatus when generatePlan throws AnthropicUpstreamError(401)", async () => {
    generatePlanMock.mockRejectedValueOnce(
      new AnthropicUpstreamError(401, "unauthorized"),
    );
    const res = await POST(
      makeRequest({ recipes: [], deals: [], logs: [], pantry: [] }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: "Anthropic upstream error",
      upstreamStatus: 401,
    });
  });

  it("returns 502 with upstreamStatus when generatePlan throws AnthropicUpstreamError(529)", async () => {
    generatePlanMock.mockRejectedValueOnce(
      new AnthropicUpstreamError(529, "overloaded"),
    );
    const res = await POST(
      makeRequest({ recipes: [], deals: [], logs: [], pantry: [] }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ upstreamStatus: 529 });
  });

  it("returns 502 when generatePlan throws AnthropicNetworkError", async () => {
    generatePlanMock.mockRejectedValueOnce(
      new AnthropicNetworkError(new Error("ECONNRESET")),
    );
    const res = await POST(
      makeRequest({ recipes: [], deals: [], logs: [], pantry: [] }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: "Anthropic network error",
    });
  });

  it("returns 502 with field path when generatePlan throws MalformedPlanError", async () => {
    generatePlanMock.mockRejectedValueOnce(
      new MalformedPlanError("meals", "expected 5 meals, got 4"),
    );
    const res = await POST(
      makeRequest({ recipes: [], deals: [], logs: [], pantry: [] }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: "Model returned malformed plan",
      path: "meals",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("returns 500 for unexpected errors and logs them", async () => {
    generatePlanMock.mockRejectedValueOnce(new Error("kaboom"));
    const res = await POST(
      makeRequest({ recipes: [], deals: [], logs: [], pantry: [] }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Unexpected error" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
