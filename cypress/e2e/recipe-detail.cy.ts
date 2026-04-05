describe("Recipe detail page", () => {
  const recipeId = "r1-chicken-stir-fry";

  beforeEach(() => {
    cy.intercept("GET", `/api/recipes/${recipeId}`, {
      fixture: "recipe-single.json",
    }).as("getRecipe");
  });

  it("displays recipe details", () => {
    cy.visit(`/recipes/${recipeId}`);
    cy.wait("@getRecipe");

    cy.get('[data-testid="recipe-detail"]').within(() => {
      cy.contains("Chicken Stir Fry");
      cy.contains("4 servings");
      cy.contains("10 min prep");
      cy.contains("15 min cook");
      cy.contains("dinner");
      cy.contains("quick");
      cy.contains("asian");
      cy.contains("chicken breast");
      cy.contains("soy sauce");
      cy.contains("Cut chicken into pieces");
    });
  });

  it("edit button navigates to edit page", () => {
    cy.visit(`/recipes/${recipeId}`);
    cy.wait("@getRecipe");

    cy.intercept("GET", `/api/recipes/${recipeId}`, {
      fixture: "recipe-single.json",
    });

    cy.get('[data-testid="edit-btn"]').click();
    cy.url().should("include", `/recipes/${recipeId}/edit`);
  });

  it("delete button confirms and deletes recipe", () => {
    cy.visit(`/recipes/${recipeId}`);
    cy.wait("@getRecipe");

    cy.intercept("DELETE", `/api/recipes/${recipeId}`, {
      statusCode: 200,
      body: { id: recipeId },
    }).as("deleteRecipe");
    cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" });

    cy.get('[data-testid="delete-btn"]').click();
    cy.contains("button", "Delete").last().click();

    cy.wait("@deleteRecipe");
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("cancel delete stays on detail page", () => {
    cy.visit(`/recipes/${recipeId}`);
    cy.wait("@getRecipe");

    cy.get('[data-testid="delete-btn"]').click();
    cy.contains("button", "Cancel").click();

    cy.url().should("include", `/recipes/${recipeId}`);
    cy.get('[data-testid="recipe-detail"]').should("exist");
  });
});
