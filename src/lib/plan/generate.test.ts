import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import {
  AnthropicNetworkError,
  AnthropicUpstreamError,
  InvalidRequestError,
  MalformedPlanError,
} from "./errors";
import type { GeneratePlanInput, MealPlan } from "./types";

const createMock = vi.fn();

vi.mock("./anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./anthropic")>();
  return {
    ...actual,
    getAnthropicClient: () => ({
      messages: { create: createMock },
    }),
  };
});

import { generatePlan, validateInput } from "./generate";

function validPlanText(): string {
  const plan: MealPlan = {
    meals: Array.from({ length: 5 }, (_, i) => ({
      title: `Meal ${i + 1}`,
      kidVersion: null,
      dealMatches: [],
    })),
    groceryList: [],
  };
  return JSON.stringify(plan);
}

function baseInput(): GeneratePlanInput {
  return {
    recipes: [],
    deals: [],
    logs: [],
    pantry: { staples: [], freezer: [] },
  };
}

describe("validateInput", () => {
  it("accepts a well-formed body and returns it typed", () => {
    const input = validateInput({
      recipes: [],
      deals: [],
      logs: [],
      pantry: { staples: ["salt"], freezer: ["chicken (Costco)"] },
      preferences: "no shellfish",
    });
    expect(input.pantry).toEqual({
      staples: ["salt"],
      freezer: ["chicken (Costco)"],
    });
    expect(input.preferences).toBe("no shellfish");
  });

  it("accepts when preferences is omitted", () => {
    const input = validateInput({
      recipes: [],
      deals: [],
      logs: [],
      pantry: { staples: [], freezer: [] },
    });
    expect(input.preferences).toBeUndefined();
  });

  it("throws InvalidRequestError when body is null", () => {
    expect(() => validateInput(null)).toThrow(InvalidRequestError);
  });

  it("throws InvalidRequestError when body is an array", () => {
    expect(() => validateInput([])).toThrow(InvalidRequestError);
  });

  it("throws InvalidRequestError when body is a string", () => {
    expect(() => validateInput("x")).toThrow(InvalidRequestError);
  });

  it("throws InvalidRequestError with field 'recipes' when recipes is missing", () => {
    try {
      validateInput({ deals: [], logs: [], pantry: [] });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("recipes");
    }
  });

  it("throws InvalidRequestError with field 'deals' when deals is not an array", () => {
    try {
      validateInput({ recipes: [], deals: "x", logs: [], pantry: [] });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("deals");
    }
  });

  it("throws InvalidRequestError with field 'logs' when logs is missing", () => {
    try {
      validateInput({ recipes: [], deals: [], pantry: [] });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("logs");
    }
  });

  it("accepts a valid logs entry", () => {
    const got = validateInput({
      recipes: [],
      deals: [],
      logs: [{ week: "2026-04-13", cooked: ["Tacos"], skipped: [] }],
      pantry: { staples: [], freezer: [] },
    });
    expect(got.logs).toHaveLength(1);
    expect(got.logs[0].week).toBe("2026-04-13");
  });

  it("throws InvalidRequestError when a log entry has malformed week", () => {
    try {
      validateInput({
        recipes: [],
        deals: [],
        logs: [{ week: "bad", cooked: [], skipped: [] }],
        pantry: { staples: [], freezer: [] },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("logs[0].week");
    }
  });

  it("throws InvalidRequestError when a log entry has non-array cooked", () => {
    try {
      validateInput({
        recipes: [],
        deals: [],
        logs: [{ week: "2026-04-13", cooked: "no", skipped: [] }],
        pantry: { staples: [], freezer: [] },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("logs[0].cooked");
    }
  });

  it("throws InvalidRequestError with field 'pantry' when pantry is the old string-array shape", () => {
    try {
      validateInput({ recipes: [], deals: [], logs: [], pantry: ["salt"] });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("pantry");
    }
  });

  it("throws InvalidRequestError with field 'pantry.staples' when staples contains non-strings", () => {
    try {
      validateInput({
        recipes: [],
        deals: [],
        logs: [],
        pantry: { staples: [1, 2], freezer: [] },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("pantry.staples");
    }
  });

  it("throws InvalidRequestError with field 'pantry.freezer' when freezer is missing", () => {
    try {
      validateInput({
        recipes: [],
        deals: [],
        logs: [],
        pantry: { staples: [] },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("pantry.freezer");
    }
  });

  it("throws InvalidRequestError with field 'preferences' when preferences is a number", () => {
    try {
      validateInput({
        recipes: [],
        deals: [],
        logs: [],
        pantry: { staples: [], freezer: [] },
        preferences: 123,
      });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as InvalidRequestError).field).toBe("preferences");
    }
  });
});

describe("generatePlan", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(() => {
    createMock.mockReset();
  });

  it("calls Anthropic with the expected model and parameters", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: validPlanText() }],
    });
    await generatePlan(baseInput());
    expect(createMock).toHaveBeenCalledTimes(1);
    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe("claude-sonnet-4-6");
    expect(args.max_tokens).toBe(4096);
    expect(args.temperature).toBe(0.7);
    expect(typeof args.system).toBe("string");
    expect(args.messages).toHaveLength(1);
    // Cache marker is on the first content block of the user message.
    const firstBlock = args.messages[0].content[0];
    expect(firstBlock.cache_control).toEqual({ type: "ephemeral" });
  });

  it("returns the parsed MealPlan on success", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: validPlanText() }],
    });
    const result = await generatePlan(baseInput());
    expect(result.meals).toHaveLength(5);
    expect(result.groceryList).toEqual([]);
  });

  it("picks the first text-type content block when multiple blocks exist", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        { type: "text", text: validPlanText() },
        { type: "text", text: "ignored" },
      ],
    });
    const result = await generatePlan(baseInput());
    expect(result.meals).toHaveLength(5);
  });

  it("maps Anthropic.APIError to AnthropicUpstreamError preserving status", async () => {
    const apiErr = new Anthropic.APIError(
      401,
      { error: { message: "unauthorized" } },
      "unauthorized",
      undefined,
    );
    createMock.mockRejectedValueOnce(apiErr);
    try {
      await generatePlan(baseInput());
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AnthropicUpstreamError);
      expect((err as AnthropicUpstreamError).status).toBe(401);
    }
  });

  it("maps Anthropic.APIError 529 (overloaded) to AnthropicUpstreamError", async () => {
    const apiErr = new Anthropic.APIError(
      529,
      { error: { message: "overloaded" } },
      "overloaded",
      undefined,
    );
    createMock.mockRejectedValueOnce(apiErr);
    try {
      await generatePlan(baseInput());
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AnthropicUpstreamError);
      expect((err as AnthropicUpstreamError).status).toBe(529);
    }
  });

  it("maps a generic network error to AnthropicNetworkError", async () => {
    createMock.mockRejectedValueOnce(new Error("fetch failed"));
    try {
      await generatePlan(baseInput());
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AnthropicNetworkError);
    }
  });

  it("throws MalformedPlanError when no text block is in the response", async () => {
    createMock.mockResolvedValueOnce({ content: [] });
    try {
      await generatePlan(baseInput());
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MalformedPlanError);
      expect((err as MalformedPlanError).path).toBe("<root>");
    }
  });

  it("propagates MalformedPlanError when response text is invalid JSON", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json" }],
    });
    try {
      await generatePlan(baseInput());
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MalformedPlanError);
    }
  });

  it("end-to-end: input → stubbed Claude response → validated MealPlan", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            meals: [
              {
                title: "Pad Thai",
                kidVersion: "no chili",
                dealMatches: [],
              },
              { title: "M2", kidVersion: null, dealMatches: [] },
              { title: "M3", kidVersion: null, dealMatches: [] },
              { title: "M4", kidVersion: null, dealMatches: [] },
              { title: "M5", kidVersion: null, dealMatches: [] },
            ],
            groceryList: [
              {
                item: "Tofu",
                quantity: "14 oz",
                store: "aldi",
                dealMatch: null,
              },
            ],
          }),
        },
      ],
    });
    const input: GeneratePlanInput = {
      recipes: [],
      deals: [],
      logs: [{ week: "2026-04-13", cooked: ["Tacos"], skipped: [] }],
      pantry: ["salt"],
      preferences: "no shellfish",
    };
    const result = await generatePlan(input);
    expect(result.meals[0].title).toBe("Pad Thai");
    expect(result.groceryList[0].store).toBe("aldi");
  });
});
