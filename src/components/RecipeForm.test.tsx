// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipeForm from "./RecipeForm";

describe("RecipeForm", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockReset();
    onSubmit.mockResolvedValue(undefined);
  });

  it("renders all form fields", () => {
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Ingredient 1 name")).toBeInTheDocument();
    expect(screen.getByLabelText("Instructions")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
    expect(screen.getByLabelText("Servings")).toBeInTheDocument();
    expect(screen.getByLabelText("Prep (min)")).toBeInTheDocument();
    expect(screen.getByLabelText("Cook (min)")).toBeInTheDocument();
    expect(screen.getByLabelText("Source URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Add Recipe")).toBeInTheDocument();
  });

  it("shows error when name is empty", async () => {
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    await userEvent.click(screen.getByText("Add Recipe"));

    expect(screen.getByText("Recipe name is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows error when no ingredient has a name", async () => {
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    await userEvent.type(screen.getByLabelText("Name *"), "Test");
    await userEvent.click(screen.getByText("Add Recipe"));

    expect(
      screen.getByText("At least one ingredient with a name is required.")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits with valid data", async () => {
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    await userEvent.type(screen.getByLabelText("Name *"), "Pasta");
    await userEvent.type(screen.getByLabelText("Ingredient 1 name"), "Noodles");
    await userEvent.type(screen.getByLabelText("Ingredient 1 quantity"), "1");
    await userEvent.type(screen.getByLabelText("Ingredient 1 unit"), "lb");
    await userEvent.type(screen.getByLabelText("Tags"), "dinner, quick");
    await userEvent.type(screen.getByLabelText("Servings"), "4");
    await userEvent.click(screen.getByText("Add Recipe"));

    expect(onSubmit).toHaveBeenCalledOnce();
    const data = onSubmit.mock.calls[0][0];
    expect(data.name).toBe("Pasta");
    expect(data.ingredients).toEqual([{ name: "Noodles", quantity: "1", unit: "lb" }]);
    expect(data.tags).toEqual(["dinner", "quick"]);
    expect(data.servings).toBe(4);
  });

  it("adds and removes ingredient rows", async () => {
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    // Start with 1 row
    expect(screen.getByLabelText("Ingredient 1 name")).toBeInTheDocument();

    // Add a row
    await userEvent.click(screen.getByText("+ Add ingredient"));
    expect(screen.getByLabelText("Ingredient 2 name")).toBeInTheDocument();

    // Remove the second row
    const removeButtons = screen.getAllByLabelText(/Remove ingredient/);
    await userEvent.click(removeButtons[1]);
    expect(screen.queryByLabelText("Ingredient 2 name")).not.toBeInTheDocument();
  });

  it("prevents removing the last ingredient row", () => {
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    const removeButton = screen.getByLabelText("Remove ingredient 1");
    expect(removeButton).toBeDisabled();
  });

  it("pre-fills form with initial data", () => {
    const initialData = {
      id: "test-id",
      name: "Existing Recipe",
      ingredients: [{ name: "Salt", quantity: "1", unit: "tsp" }],
      instructions: "Mix well",
      tags: ["dinner", "easy"],
      servings: 4,
      prep_time: 10,
      cook_time: 30,
      source_url: "https://example.com",
      notes: "Good recipe",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    render(
      <RecipeForm
        initialData={initialData}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
      />
    );

    expect(screen.getByLabelText("Name *")).toHaveValue("Existing Recipe");
    expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue("Salt");
    expect(screen.getByLabelText("Instructions")).toHaveValue("Mix well");
    expect(screen.getByLabelText("Tags")).toHaveValue("dinner, easy");
    expect(screen.getByLabelText("Servings")).toHaveValue(4);
    expect(screen.getByLabelText("Prep (min)")).toHaveValue(10);
    expect(screen.getByLabelText("Cook (min)")).toHaveValue(30);
    expect(screen.getByLabelText("Source URL")).toHaveValue("https://example.com");
    expect(screen.getByLabelText("Notes")).toHaveValue("Good recipe");
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("shows error when onSubmit throws", async () => {
    onSubmit.mockRejectedValue(new Error("API error"));
    render(<RecipeForm onSubmit={onSubmit} submitLabel="Add Recipe" />);

    await userEvent.type(screen.getByLabelText("Name *"), "Test");
    await userEvent.type(screen.getByLabelText("Ingredient 1 name"), "Salt");
    await userEvent.click(screen.getByText("Add Recipe"));

    expect(screen.getByText("API error")).toBeInTheDocument();
  });
});
