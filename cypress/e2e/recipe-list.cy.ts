describe("Recipe list page", () => {
  it("displays list of recipes fetched from API", () => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as(
      "getRecipes"
    );
    cy.visit("/");
    cy.wait("@getRecipes");

    cy.get('[data-testid="recipe-list-item"]').should("have.length", 6);
    cy.contains("Chicken Stir Fry");
    cy.contains("Pasta Carbonara");
  });

  it("shows empty state when no recipes exist", () => {
    cy.intercept("GET", "/api/recipes", { body: [] }).as("getRecipes");
    cy.visit("/");
    cy.wait("@getRecipes");

    cy.get('[data-testid="empty-state"]').should("exist");
    cy.contains("No recipes yet");
  });

  it("filters recipes by search input", () => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as(
      "getRecipes"
    );
    cy.visit("/");
    cy.wait("@getRecipes");

    cy.get('[data-testid="search-input"]').type("chicken");
    cy.get('[data-testid="recipe-list-item"]').should("have.length", 1);
    cy.contains("Chicken Stir Fry");
  });

  it("filters recipes by tag", () => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as(
      "getRecipes"
    );
    cy.visit("/");
    cy.wait("@getRecipes");

    cy.get('[data-testid="tag-filter-italian"]').click();
    cy.get('[data-testid="recipe-list-item"]').should("have.length", 2);
    cy.contains("Pasta Carbonara");
    cy.contains("Margherita Pizza");
  });

  it("combines search and tag filter", () => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as(
      "getRecipes"
    );
    cy.visit("/");
    cy.wait("@getRecipes");

    cy.get('[data-testid="tag-filter-italian"]').click();
    cy.get('[data-testid="search-input"]').type("pasta");
    cy.get('[data-testid="recipe-list-item"]').should("have.length", 1);
    cy.contains("Pasta Carbonara");
  });

  it("clears filter when tag is clicked again", () => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as(
      "getRecipes"
    );
    cy.visit("/");
    cy.wait("@getRecipes");

    cy.get('[data-testid="tag-filter-italian"]').click();
    cy.get('[data-testid="recipe-list-item"]').should("have.length", 2);

    cy.get('[data-testid="tag-filter-italian"]').click();
    cy.get('[data-testid="recipe-list-item"]').should("have.length", 6);
  });

  it("clicking a recipe navigates to detail page", () => {
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as(
      "getRecipes"
    );
    cy.intercept("GET", "/api/recipes/r1-chicken-stir-fry", {
      fixture: "recipe-single.json",
    }).as("getRecipe");

    cy.visit("/");
    cy.wait("@getRecipes");

    cy.contains("Chicken Stir Fry").click();
    cy.url().should("include", "/recipes/r1-chicken-stir-fry");
  });
});
