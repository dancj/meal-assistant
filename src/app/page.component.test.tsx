// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import RecipeList from "@/components/RecipeList";
import userEvent from "@testing-library/user-event";
import type { Recipe } from "@/types/recipe";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "test-id",
    name: "Test Recipe",
    ingredients: [{ name: "Salt", quantity: "1", unit: "tsp" }],
    instructions: null,
    tags: [],
    servings: 4,
    prep_time: null,
    cook_time: null,
    source_url: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("RecipeList", () => {
  it("shows empty state when no recipes", () => {
    render(<RecipeList recipes={[]} />);
    expect(screen.getByText("No recipes yet")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders recipe cards", () => {
    const recipes = [
      makeRecipe({ id: "1", name: "Pasta", servings: 4, tags: ["dinner"] }),
      makeRecipe({ id: "2", name: "Tacos", servings: 2, tags: ["quick"] }),
    ];
    render(<RecipeList recipes={recipes} />);
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.getByText("Tacos")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    const recipes = [
      makeRecipe({ id: "1", name: "Pasta Carbonara" }),
      makeRecipe({ id: "2", name: "Chicken Tacos" }),
    ];
    render(<RecipeList recipes={recipes} />);

    const input = screen.getByPlaceholderText("Search recipes...");
    await userEvent.type(input, "pasta");

    expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Tacos")).not.toBeInTheDocument();
  });

  it("filters by tag", async () => {
    const recipes = [
      makeRecipe({ id: "1", name: "Pasta", tags: ["italian"] }),
      makeRecipe({ id: "2", name: "Tacos", tags: ["mexican"] }),
    ];
    render(<RecipeList recipes={recipes} />);

    // Click the tag filter button (not the tag label in a recipe card)
    const tagButtons = screen.getAllByText("italian");
    await userEvent.click(tagButtons[0]);

    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.queryByText("Tacos")).not.toBeInTheDocument();
  });

  it("shows no-results message when search matches nothing", async () => {
    const recipes = [makeRecipe({ id: "1", name: "Pasta" })];
    render(<RecipeList recipes={recipes} />);

    const input = screen.getByPlaceholderText("Search recipes...");
    await userEvent.type(input, "zzzzz");

    expect(
      screen.getByText("No recipes match your search")
    ).toBeInTheDocument();
  });

  it("deselects tag when clicked again", async () => {
    const recipes = [
      makeRecipe({ id: "1", name: "Pasta", tags: ["italian"] }),
      makeRecipe({ id: "2", name: "Tacos", tags: ["mexican"] }),
    ];
    render(<RecipeList recipes={recipes} />);

    const tagButtons = screen.getAllByText("italian");
    await userEvent.click(tagButtons[0]);
    expect(screen.queryByText("Tacos")).not.toBeInTheDocument();

    // The tag button is still visible (it's the active filter) plus the recipe card tag
    const activeTagButtons = screen.getAllByText("italian");
    await userEvent.click(activeTagButtons[0]);
    expect(screen.getByText("Tacos")).toBeInTheDocument();
  });
});
