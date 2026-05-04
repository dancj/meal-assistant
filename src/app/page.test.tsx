// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchRecipesMock,
  fetchDealsMock,
  fetchRecentLogsMock,
  fetchPantryMock,
  postMealLogMock,
  generatePlanMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  fetchRecipesMock: vi.fn(),
  fetchDealsMock: vi.fn(),
  fetchRecentLogsMock: vi.fn(),
  fetchPantryMock: vi.fn(),
  postMealLogMock: vi.fn(),
  generatePlanMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

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
    sendEmail: (plan: unknown) => sendEmailMock(plan),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { HomePage } from "@/components/home-page";
import type { Deal } from "@/lib/deals/types";
import type { MealPlan } from "@/lib/plan/types";

const Home = () => <HomePage emailEnabled={false} />;
const HomeWithEmail = () => <HomePage emailEnabled={true} />;

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
  // Pin the clock so the Editorial Eyebrow assertion (week range + ISO week
  // number) is stable. 2026-04-30 falls in ISO week 18 of 2026, week start
  // Mon 2026-04-27. Fake only Date so setTimeout/setInterval keep working
  // (waitFor depends on real timers).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-04-30T12:00:00Z"));
  fetchRecipesMock.mockReset();
  fetchDealsMock.mockReset();
  fetchRecentLogsMock.mockReset();
  fetchRecentLogsMock.mockResolvedValue([]);
  fetchPantryMock.mockReset();
  fetchPantryMock.mockResolvedValue({ staples: [], freezer: [] });
  postMealLogMock.mockReset();
  postMealLogMock.mockResolvedValue({ ok: true });
  generatePlanMock.mockReset();
  sendEmailMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Home page", () => {
  it("renders 5 meal rows, deals sidebar, and grocery list after load", async () => {
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

  it("renders the Editorial week hero (eyebrow + display title)", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });

    // Eyebrow shows Mon-Sun ISO week range + week number
    expect(screen.getByText(/Apr 27 — May 03/)).toBeInTheDocument();
    expect(screen.getByText(/Issue 18/)).toBeInTheDocument();
    // Display-typography hero
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("This week, we're cooking.");
    expect(heading).toHaveClass("text-display");
  });

  it("each MealRow carries data-testid='day-row' (5 rows)", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });

    expect(screen.getAllByTestId("day-row")).toHaveLength(5);
  });

  it("does not render an Email me this button when emailEnabled=false", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /email me this/i }),
    ).toBeNull();
  });

  it("renders the Email me this button when emailEnabled=true and clicking it POSTs the plan", async () => {
    fetchRecipesMock.mockResolvedValue(recipes);
    fetchDealsMock.mockResolvedValue(deals);
    generatePlanMock.mockResolvedValue(fivePlan);
    sendEmailMock.mockResolvedValue({ ok: true, id: "re_abc123" });

    render(<HomeWithEmail />);
    await waitFor(() => {
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /email me this/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);

    await waitFor(() => {
      expect(sendEmailMock).toHaveBeenCalledWith(fivePlan);
    });
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

  describe("SwapDrawer flow", () => {
    const recipesForSwap = [
      {
        title: "Pan-seared salmon",
        tags: ["dinner", "fish"],
        kidVersion: null,
        content: "",
        filename: "pan-seared-salmon.md",
      },
      {
        title: "Honey chicken",
        tags: ["dinner", "chicken"],
        kidVersion: null,
        content: "",
        filename: "honey-chicken.md",
      },
      {
        title: "Tofu bowl",
        tags: ["dinner", "vegetarian"],
        kidVersion: null,
        content: "",
        filename: "tofu-bowl.md",
      },
    ];

    it("clicking Swap opens a dialog titled 'Choose a swap'", async () => {
      fetchRecipesMock.mockResolvedValue(recipesForSwap);
      fetchDealsMock.mockResolvedValue(deals);
      generatePlanMock.mockResolvedValue(fivePlan);

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText("Meal-A")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /swap meal 2/i }));

      const dialog = await screen.findByRole("dialog", {
        name: "Choose a swap",
      });
      expect(dialog).toBeInTheDocument();
    });

    it("the dialog header shows the slot's day code and date", async () => {
      fetchRecipesMock.mockResolvedValue(recipesForSwap);
      fetchDealsMock.mockResolvedValue(deals);
      generatePlanMock.mockResolvedValue(fivePlan);

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText("Meal-A")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /swap meal 2/i }));
      await screen.findByRole("dialog");
      // Slot index 1 = TUE, week start Mon 2026-04-27 → Apr 28
      expect(screen.getByText(/TUE · Apr 28/)).toBeInTheDocument();
    });

    it("the dialog body lists ranked SwapSuggestion buttons", async () => {
      fetchRecipesMock.mockResolvedValue(recipesForSwap);
      fetchDealsMock.mockResolvedValue(deals);
      generatePlanMock.mockResolvedValue(fivePlan);

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText("Meal-A")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /swap meal 2/i }));
      await screen.findByRole("dialog");
      const suggestions = screen.getAllByTestId("swap-suggestion");
      expect(suggestions.length).toBe(3);
    });

    it("clicking a suggestion replaces the meal locally, dismisses the drawer, and reveals the grocery-stale hint", async () => {
      fetchRecipesMock.mockResolvedValue(recipesForSwap);
      fetchDealsMock.mockResolvedValue(deals);
      generatePlanMock.mockResolvedValue(fivePlan);

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText("Meal-A")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /swap meal 2/i }));
      await screen.findByRole("dialog");
      const generateCallsBefore = generatePlanMock.mock.calls.length;

      fireEvent.click(
        screen.getByRole("button", { name: /Swap to Pan-seared salmon/i }),
      );

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      // Meal-B was at index 1 — now replaced by Pan-seared salmon
      expect(screen.getByText("Pan-seared salmon")).toBeInTheDocument();
      expect(screen.queryByText("Meal-B")).toBeNull();
      // Other 4 meals unchanged
      expect(screen.getByText("Meal-A")).toBeInTheDocument();
      expect(screen.getByText("Meal-C")).toBeInTheDocument();
      expect(screen.getByText("Meal-D")).toBeInTheDocument();
      expect(screen.getByText("Meal-E")).toBeInTheDocument();
      // No new generatePlan call — the swap is purely local
      expect(generatePlanMock.mock.calls.length).toBe(generateCallsBefore);
      // Grocery-stale hint appears
      expect(screen.getByTestId("grocery-stale-hint")).toBeInTheDocument();
    });

    it("clicking 'Regenerate to refresh' inside the hint triggers regenerate and clears the hint", async () => {
      fetchRecipesMock.mockResolvedValue(recipesForSwap);
      fetchDealsMock.mockResolvedValue(deals);
      generatePlanMock.mockResolvedValueOnce(fivePlan);

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText("Meal-A")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /swap meal 2/i }));
      await screen.findByRole("dialog");
      fireEvent.click(
        screen.getByRole("button", { name: /Swap to Pan-seared salmon/i }),
      );
      await waitFor(() => {
        expect(screen.getByTestId("grocery-stale-hint")).toBeInTheDocument();
      });

      const fresh: MealPlan = {
        meals: fivePlan.meals.map((m, i) => ({ ...m, title: `Refreshed-${i}` })),
        groceryList: fivePlan.groceryList,
      };
      generatePlanMock.mockResolvedValueOnce(fresh);

      fireEvent.click(
        screen.getByRole("button", { name: /Regenerate to refresh/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Refreshed-0")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("grocery-stale-hint")).toBeNull();
    });

    it("renders the empty-state copy when every recipe is already in the plan", async () => {
      // Recipes pool == titles already in the plan ⇒ ranker returns []
      const matchingRecipes = fivePlan.meals.map((m, i) => ({
        title: m.title,
        tags: [] as string[],
        kidVersion: null,
        content: "",
        filename: `meal-${i}.md`,
      }));
      fetchRecipesMock.mockResolvedValue(matchingRecipes);
      fetchDealsMock.mockResolvedValue(deals);
      generatePlanMock.mockResolvedValue(fivePlan);

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText("Meal-A")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /swap meal 2/i }));
      await screen.findByRole("dialog");
      expect(
        screen.getByText(
          /No swaps available — your week already uses every recipe\./,
        ),
      ).toBeInTheDocument();
      expect(screen.queryAllByTestId("swap-suggestion")).toHaveLength(0);
    });
  });
});
