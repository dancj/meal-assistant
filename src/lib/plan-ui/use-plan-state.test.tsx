// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchRecipesMock = vi.fn();
const fetchDealsMock = vi.fn();
const fetchRecentLogsMock = vi.fn();
const fetchPantryMock = vi.fn();
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
    fetchPantry: () => fetchPantryMock(),
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
  fetchPantryMock.mockReset();
  fetchPantryMock.mockResolvedValue({ staples: [], freezer: [] });
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
      pantry: { staples: [], freezer: [] },
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
      pantry: { staples: [], freezer: [] },
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
      pantry: { staples: [], freezer: [] },
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

describe("usePlanState — swap drawer", () => {
  async function readyHook() {
    fetchRecipesMock.mockResolvedValue([]);
    fetchDealsMock.mockResolvedValue([]);
    generatePlanMock.mockResolvedValue(fivePlan);
    const { result } = renderHook(() => usePlanState());
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    });
    return result;
  }

  it("swap(index) opens the drawer without calling generatePlan", async () => {
    const result = await readyHook();
    const callsBefore = generatePlanMock.mock.calls.length;

    await act(async () => {
      result.current.swap(2);
    });

    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(result.current.state.swapTarget).toBe(2);
    expect(generatePlanMock.mock.calls.length).toBe(callsBefore);
  });

  it("closeSwap() clears swapTarget", async () => {
    const result = await readyHook();
    await act(async () => {
      result.current.swap(2);
    });
    await act(async () => {
      result.current.closeSwap();
    });
    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(result.current.state.swapTarget).toBeNull();
  });

  it("applySwap(index, recipe) replaces meals[index] locally and sets planMutatedSinceGenerate", async () => {
    const result = await readyHook();
    const r = {
      title: "Pan-seared salmon",
      tags: ["fish"],
      kidVersion: null,
      content: "",
      filename: "salmon.md",
    };
    await act(async () => {
      result.current.swap(2);
    });
    await act(async () => {
      result.current.applySwap(2, r);
    });
    if (result.current.state.status !== "ready") throw new Error("expected ready");
    expect(result.current.state.plan.meals.map((m) => m.title)).toEqual([
      "A",
      "B",
      "Pan-seared salmon",
      "D",
      "E",
    ]);
    expect(result.current.state.swapTarget).toBeNull();
    expect(result.current.state.planMutatedSinceGenerate).toBe(true);
  });

  it("applySwap does not call generatePlan", async () => {
    const result = await readyHook();
    const callsBefore = generatePlanMock.mock.calls.length;
    const r = {
      title: "X",
      tags: [],
      kidVersion: null,
      content: "",
      filename: "x.md",
    };
    await act(async () => {
      result.current.applySwap(0, r);
    });
    expect(generatePlanMock.mock.calls.length).toBe(callsBefore);
  });
});
