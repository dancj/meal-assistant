// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchRecipesMock = vi.fn();
const fetchDealsMock = vi.fn();
const fetchRecentLogsMock = vi.fn();
const fetchPantryMock = vi.fn();
const postMealLogMock = vi.fn();
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
    postMealLog: (entry: unknown) => postMealLogMock(entry),
    generatePlan: (input: unknown) => generatePlanMock(input),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { HomePage } from "@/components/home-page";
import type { Deal } from "@/lib/deals/types";
import type { MealPlan } from "@/lib/plan/types";

const Home = () => <HomePage emailEnabled={false} />;

const recipes = [
  { title: "R1", tags: [], kidVersion: null, content: "x", filename: "r1.md" },
];

const deals: Deal[] = [
  {
    productName: "chicken thighs",
    brand: "Brand",
    salePrice: "$1.99/lb",
    regularPrice: "$3.99/lb",
    promoType: "sale",
    validFrom: "2026-04-25",
    validTo: "2026-05-01",
    store: "safeway",
  },
];

const fivePlan: MealPlan = {
  meals: [
    { title: "Meal-A", kidVersion: null, dealMatches: [] },
    { title: "Meal-B", kidVersion: null, dealMatches: [] },
    { title: "Meal-C", kidVersion: null, dealMatches: [] },
    { title: "Meal-D", kidVersion: null, dealMatches: [] },
    { title: "Meal-E", kidVersion: null, dealMatches: [] },
  ],
  groceryList: [
    { item: "chicken thighs", quantity: "2 lb", store: "safeway", dealMatch: null },
  ],
};

beforeEach(() => {
  fetchRecipesMock.mockReset();
  fetchDealsMock.mockReset();
  fetchRecentLogsMock.mockReset();
  fetchRecentLogsMock.mockResolvedValue([]);
  fetchPantryMock.mockReset();
  fetchPantryMock.mockResolvedValue({ staples: [], freezer: [] });
  postMealLogMock.mockReset();
  postMealLogMock.mockResolvedValue({ ok: true });
  generatePlanMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Home page", () => {
  it("renders 5 meal cards, deals sidebar, and grocery list after load", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });

    expect(screen.getByText("Meal-B")).toBeInTheDocument();
    expect(screen.getByText("Meal-E")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Meal \d:/)).toHaveLength(5);
    expect(screen.getByLabelText(/this week's deals/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/grocery list/i)).toBeInTheDocument();
  });

  it("does not render an Email me this button (deferred to #70)", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });
    expect(screen.queryByText(/email me/i)).toBeNull();
  });

  it("renders error state with retry button when initial fetch fails", async () => {
    fetchRecipesMock.mockRejectedValue(new Error("recipes boom"));
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Meal-A")).toBeNull();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("regenerate calls generatePlan with original recipes/deals and replaces plan", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValueOnce(fivePlan);

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });

    const fresh: MealPlan = {
      ...fivePlan,
      meals: fivePlan.meals.map((m, i) => ({ ...m, title: `New-${i}` })),
    };
    generatePlanMock.mockResolvedValueOnce(fresh);

    fireEvent.click(screen.getByRole("button", { name: /regenerate plan/i }));

    await waitFor(() => {
      expect(screen.getByText("New-0")).toBeInTheDocument();
    });
    expect(generatePlanMock).toHaveBeenLastCalledWith({
      recipes,
      deals,
      logs: [],
      pantry: { staples: [], freezer: [] },
    });
  });

  it("swap on meal index 3 changes only that card", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValueOnce(fivePlan);

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Meal-D")).toBeInTheDocument();
    });

    const swapPlan: MealPlan = {
      meals: [
        { title: "SWAPPED", kidVersion: null, dealMatches: [] },
        { title: "x", kidVersion: null, dealMatches: [] },
        { title: "x", kidVersion: null, dealMatches: [] },
        { title: "x", kidVersion: null, dealMatches: [] },
        { title: "x", kidVersion: null, dealMatches: [] },
      ],
      groceryList: [],
    };
    generatePlanMock.mockResolvedValueOnce(swapPlan);

    fireEvent.click(screen.getByRole("button", { name: /swap meal 4/i }));

    await waitFor(() => {
      expect(screen.getByText("SWAPPED")).toBeInTheDocument();
    });
    expect(screen.getByText("Meal-A")).toBeInTheDocument();
    expect(screen.getByText("Meal-B")).toBeInTheDocument();
    expect(screen.getByText("Meal-C")).toBeInTheDocument();
    expect(screen.getByText("Meal-E")).toBeInTheDocument();
    expect(screen.queryByText("Meal-D")).toBeNull();
  });
});
