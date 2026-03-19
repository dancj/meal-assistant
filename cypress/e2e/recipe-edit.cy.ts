describe("Edit recipe flow", () => {
  const recipeId = "r1-chicken-stir-fry";

  beforeEach(() => {
    cy.intercept("GET", `/api/recipes/${recipeId}`, {
      fixture: "recipe-single.json",
    }).as("getRecipe");
  });

  it("form is pre-populated with existing recipe data", () => {
    cy.visit(`/recipes/${recipeId}/edit`);
    cy.wait("@getRecipe");

    cy.get('[data-testid="recipe-name-input"]').should(
      "have.value",
      "Chicken Stir Fry"
    );
    cy.get('[data-testid="recipe-servings-input"]').should("have.value", "4");
    cy.get("#tags").should("have.value", "dinner, quick, asian");
    cy.get("#instructions").should(
      "contain.value",
      "Cut chicken into pieces"
    );
    cy.get('[data-testid="ingredient-row"]').should("have.length", 4);
  });

  it("modifies fields and submits successfully", () => {
    cy.visit(`/recipes/${recipeId}/edit`);
    cy.wait("@getRecipe");

    cy.intercept("PUT", `/api/recipes/${recipeId}`, {
      statusCode: 200,
      body: {
        id: recipeId,
        name: "Updated Chicken Stir Fry",
        ingredients: [
          { name: "chicken breast", quantity: "1", unit: "lb" },
          { name: "soy sauce", quantity: "3", unit: "tbsp" },
          { name: "broccoli", quantity: "2", unit: "cups" },
          { name: "rice", quantity: "1", unit: "cup" },
        ],
        instructions: "Updated instructions.",
        tags: ["dinner", "quick", "asian"],
        servings: 6,
        prep_time: 10,
        cook_time: 15,
        source_url: null,
        notes: null,
        created_at: "2026-03-01T12:00:00Z",
        updated_at: "2026-03-18T12:00:00Z",
      },
    }).as("updateRecipe");

    cy.intercept("GET", `/api/recipes/${recipeId}`, {
      fixture: "recipe-single.json",
    });

    cy.get('[data-testid="recipe-name-input"]')
      .clear()
      .type("Updated Chicken Stir Fry");
    cy.get('[data-testid="recipe-servings-input"]').clear().type("6");

    cy.get('[data-testid="submit-btn"]').click();
    cy.wait("@updateRecipe");

    cy.url().should("include", `/recipes/${recipeId}`);
  });

  it("shows validation error when name is cleared", () => {
    cy.visit(`/recipes/${recipeId}/edit`);
    cy.wait("@getRecipe");

    cy.get('[data-testid="recipe-name-input"]').clear();
    cy.get('[data-testid="submit-btn"]').click();

    cy.get('[data-testid="form-error"]').should(
      "contain",
      "Recipe name is required"
    );
  });
});
