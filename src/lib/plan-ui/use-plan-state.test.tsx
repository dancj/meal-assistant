// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchRecipesMock = vi.fn();
const fetchDealsMock = vi.fn();
const fetchRecentLogsMock = vi.fn();
const generatePlanMock = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>(
    "@/lib/api/client",
  );
  return {
    ...actual,
    fetchRecipes: () => fetchRecipesMock(),
    fetchDeals: () => fetchDealsMock(),
    fetchRecentLogs: (weeks?: number) => fetchRecentLogsMock(weeks),
    generatePlan: (input: unknown) => generatePlanMock(input),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { usePlanState } from "./use-plan-state";
import type { MealPlan, MealPlanMeal } from "@/lib/plan/types";

function meal(title: string): MealPlanMeal {
  return { title, kidVersion: null, dealMatches: [] };
}

function plan(titles: string[]): MealPlan {
  return {
    meals: titles.map(meal),
    groceryList: [],
  };
}

const fivePlan = plan(["A", "B", "C", "D", "E"]);

beforeEach(() => {
  fetchRecipesMock.mockReset();
  fetchDealsMock.mockReset();
  fetchRecentLogsMock.mockReset();
  fetchRecentLogsMock.mockResolvedValue([]);
  generatePlanMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("usePlanState — initial load", () => {
  it("transitions loading -> ready after parallel fetch + generate", async () => {
    fetchRecipesMock.mockResolvedValue([]);
    fetchDealsMock.mockResolvedValue([]);
    generatePlanMock.mockResolvedValue(fivePlan);

    const { result } = renderHook(() => usePlanState());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });

    expect(fetchRecipesMock).toHaveBeenCalledTimes(1);
    expect(fetchDealsMock).toHaveBeenCalledTimes(1);
    expect(fetchRecentLogsMock).toHaveBeenCalledTimes(1);
    expect(generatePlanMock).toHaveBeenCalledTimes(1);
    expect(generatePlanMock).toHaveBeenCalledWith({
      recipes: [],
      deals: [],
      logs: [],
      pantry: [],
    });
  });

  it("passes fetched logs through to generatePlan", async () => {
    fetchRecipesMock.mockResolvedValue([]);
    fetchDealsMock.mockResolvedValue([]);
    const logs = [
      { week: "2026-04-13", cooked: ["Tacos"], skipped: [] },
    ];
    fetchRecentLogsMock.mockResolvedValue(logs);
    generatePlanMock.mockResolvedValue(fivePlan);

    const { result } = renderHook(() => usePlanState());
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });
    expect(generatePlanMock).toHaveBeenCalledWith({
      recipes: [],
      deals: [],
      logs,
      pantry: [],
    });
  });

  it("degrades to logs=[] and warns when fetchRecentLogs rejects", async () => {
    fetchRecipesMock.mockResolvedValue([]);
    fetchDealsMock.mockResolvedValue([]);
    fetchRecentLogsMock.mockRejectedValue(new Error("logs unavailable"));
    generatePlanMock.mockResolvedValue(fivePlan);

    const { result } = renderHook(() => usePlanState());
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });
    expect(generatePlanMock).toHaveBeenCalledWith({
      recipes: [],
      deals: [],
      logs: [],
      pantry: [],
    });
  });

  it("transitions to error and skips generate when fetchRecipes rejects", async () => {
    fetchRecipesMock.mockRejectedValue(new Error("recipes boom"));
    fetchDealsMock.mockResolvedValue([]);
    generatePlanMock.mockResolvedValue(fivePlan);

    const { result } = renderHook(() => usePlanState());

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });

    expect(generatePlanMock).not.toHaveBeenCalled();
    if (result.current.state.status === "error") {
      expect(result.current.state.error).toMatch(/recipes boom/);
    }
  });

  it("transitions to error when generatePlan rejects", async () => {
    fetchRecipesMock.mockResolvedValue([]);
    fetchDealsMock.mockResolvedValue([]);
    generatePlanMock.mockRejectedValue(new Error("anthropic down"));

    const { result } = renderHook(() => usePlanState());

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
  });
});

describe("usePlanState — swap", () => {
  it("calls generatePlan with original recipes/deals and replaces meals[index]", async () => {
    const recipes = [
      { title: "R", tags: [], kidVersion: null, content: "x", filename: "r.md" },
    ];
    const deals = [
      {
        productName: "P",
        brand: "B",
        salePrice: "$1",
        regularPrice: "$2",
        promoType: "sale" as const,
        validFrom: "2026-04-25",
        validTo: "2026-05-01",
        store: "aldi" as const,
      },
    ];
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValueOnce(fivePlan);

    const { result } = renderHook(() => usePlanState());
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });

    const swapPlan = plan(["NEW", "x", "x", "x", "x"]);
    generatePlanMock.mockResolvedValueOnce(swapPlan);

    await act(async () => {
      result.current.swap(2);
    });

    await waitFor(() => {
      if (result.current.state.status !== "ready") return;
      expect(result.current.state.generating).toBe(false);
    });

    expect(generatePlanMock).toHaveBeenLastCalledWith({
      recipes,
      deals,
      logs: [],
      pantry: [],
    });

    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(result.current.state.plan.meals.map((m) => m.title)).toEqual([
      "A",
      "B",
      "NEW",
      "D",
      "E",
    ]);
  });
});
