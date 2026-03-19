describe("Create recipe flow", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" });
  });

  it("navigates to /recipes/new via Add Recipe link", () => {
    cy.visit("/");
    cy.get('[data-testid="add-recipe-link"]').click();
    cy.url().should("include", "/recipes/new");
    cy.contains("Add Recipe");
  });

  it("fills in recipe fields and submits successfully", () => {
    cy.intercept("POST", "/api/recipes", {
      statusCode: 201,
      body: {
        id: "new-recipe-id",
        name: "Test Recipe",
        ingredients: [{ name: "flour", quantity: "2", unit: "cups" }],
        instructions: "Mix and bake.",
        tags: ["baking"],
        servings: 4,
        prep_time: null,
        cook_time: null,
        source_url: null,
        notes: null,
        created_at: "2026-03-18T12:00:00Z",
        updated_at: "2026-03-18T12:00:00Z",
      },
    }).as("createRecipe");

    cy.visit("/recipes/new");

    cy.get('[data-testid="recipe-name-input"]').type("Test Recipe");
    cy.get('[data-testid="recipe-servings-input"]').type("4");
    cy.get("#tags").type("baking");
    cy.get("#instructions").type("Mix and bake.");

    // Fill first ingredient
    cy.get('[data-testid="ingredient-row"]')
      .first()
      .within(() => {
        cy.get('input[placeholder="Ingredient name"]').type("flour");
        cy.get('input[placeholder="Qty"]').type("2");
        cy.get('input[placeholder="Unit"]').type("cups");
      });

    cy.get('[data-testid="submit-btn"]').click();
    cy.wait("@createRecipe");

    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("adds and removes ingredient rows", () => {
    cy.visit("/recipes/new");

    cy.get('[data-testid="ingredient-row"]').should("have.length", 1);

    cy.get('[data-testid="add-ingredient-btn"]').click();
    cy.get('[data-testid="ingredient-row"]').should("have.length", 2);

    cy.get('[data-testid="add-ingredient-btn"]').click();
    cy.get('[data-testid="ingredient-row"]').should("have.length", 3);

    // Remove the last ingredient row
    cy.get('[data-testid="remove-ingredient-btn"]').last().click();
    cy.get('[data-testid="ingredient-row"]').should("have.length", 2);
  });

  it("shows validation error when name is empty", () => {
    cy.visit("/recipes/new");

    // Fill an ingredient but leave name empty
    cy.get('[data-testid="ingredient-row"]')
      .first()
      .within(() => {
        cy.get('input[placeholder="Ingredient name"]').type("flour");
      });

    cy.get('[data-testid="submit-btn"]').click();

    cy.get('[data-testid="form-error"]').should(
      "contain",
      "Recipe name is required"
    );
  });

  it("shows validation error when no ingredients have names", () => {
    cy.visit("/recipes/new");

    cy.get('[data-testid="recipe-name-input"]').type("Test Recipe");
    // Don't fill any ingredient names

    cy.get('[data-testid="submit-btn"]').click();

    cy.get('[data-testid="form-error"]').should(
      "contain",
      "At least one ingredient with a name is required"
    );
  });
});
