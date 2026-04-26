---
name: meal-assistant:tdd-cypress
description: TDD workflow for end-to-end tests using Cypress in the meal-assistant codebase. Use when implementing user-facing features, fixing UI bugs, or adding e2e test coverage with a test-first approach. Triggers on "e2e TDD", "cypress TDD", "test-driven e2e", "e2e test first", or when the user requests test-driven development for end-to-end or integration-level browser tests.
---

# Test-Driven Development with Cypress E2E

Integrate red-green-refactor discipline into feature implementation using Cypress for end-to-end tests in the meal-assistant codebase.

## Philosophy

E2E tests verify that the system works as a user would experience it. In TDD, the e2e test is written first to define the acceptance criteria, then the feature is built to satisfy it.

E2E TDD works at a coarser granularity than unit TDD — each cycle covers a user-visible behavior or workflow, not an internal function.

## When to Use

**Apply Cypress TDD when:**

- Implementing new user-facing features or workflows on `/` (and any future page)
- Fixing bugs that are observable in the browser (loading states, regenerate flow, swap flow, thumbs interaction)
- Adding acceptance tests for existing features
- Building flows that span multiple components and API calls (mount → fetch trio → render → click → POST)

**Skip Cypress TDD when:**

- Testing pure utility logic, validators, or reducers (use `meal-assistant:tdd-vitest`)
- Testing API route handler error mapping in isolation (use `meal-assistant:tdd-vitest`)
- Pure styling or layout changes with no behavioral impact
- Exploratory spikes

## Activation

When this skill triggers:

1. **Identify the feature area.** Map it to (or create) a directory under `cypress/e2e/`:
   - Page-level mount + render → `cypress/e2e/home/`
   - Thumbs/skip-reason flow → `cypress/e2e/log/`
   - Demo-mode smoke → `cypress/e2e/smoke/`
   - New feature area → create new directory under `cypress/e2e/`
2. **Default to demo-mode runs.** Real `GITHUB_PAT` / `ANTHROPIC_API_KEY` are not available in CI. Set `DEMO_MODE=1` for the dev server `npm run e2e` boots so the page renders fixture data deterministically. Real-credential runs are an opt-in for local development only.
3. **Check for existing intercepts and fixtures.** Reuse `cypress/support/*` helpers and `cypress/fixtures/*` data.
4. **If a plan exists or is being created**, restructure tasks with e2e RED-GREEN-REFACTOR steps inside the relevant unit.
5. **If no plan exists,** begin the first RED step for the current task.

## Project Test Configuration

```bash
# Run e2e tests
npm run e2e              # Boot dev server + run cypress headless
npm run cypress:open     # Cypress only (assumes dev server running)
npm run cypress:run      # Cypress only headless (assumes dev server running)
```

- **Base URL:** `http://localhost:3000` (configured in `cypress.config.ts`)
- **Spec pattern:** `cypress/e2e/**/*.cy.{ts,tsx,js,jsx}` (Cypress default)
- **Fixtures:** `cypress/fixtures/` (existing: `recipes.json`, `recipe-single.json`, `empty-recipes.json`)
- **Support:** `cypress/support/` (existing: `commands.ts`, `e2e.ts` — both currently minimal)
- **Auth:** None — meal-assistant is single-user, no login flow
- **Env:** `DEMO_MODE=1` recommended for deterministic E2E. Without it, the page calls real GitHub / Flipp / Anthropic and depends on creds + external availability.

### Directory structure (target)

```
cypress/
├── e2e/
│   ├── smoke/             # Page-level demo-mode smoke (mount, render, click)
│   ├── home/              # Single-page UI behaviors (regenerate, swap)
│   └── log/               # Thumbs / skip-reason interactions (when applicable)
├── support/
│   ├── e2e.ts             # Global setup
│   ├── commands.ts        # Custom commands
│   └── intercepts.ts      # Per-API intercept helpers (added as needed)
└── fixtures/
    ├── recipes.json       # Existing
    ├── recipe-single.json # Existing
    ├── empty-recipes.json # Existing
    └── meal-plan.json     # Add as needed
```

## The Cycle

For each user-visible behavior:

### 1. RED — Write a Failing E2E Test

Write a Cypress test that describes the expected user experience. Run `npm run cypress:run` (or `cypress:open` for visual feedback) and confirm the test fails.

The failure should be meaningful — "element not found" or "expected text not visible" — not a test setup error.

**Test naming — describe user workflows:**

| Bad | Good |
|---|---|
| `test home page` | `renders five meal cards from the demo plan` |
| `test thumbs` | `clicking thumbs-down on a meal card reveals the skip-reason input` |
| `test regenerate` | `clicking regenerate replaces all five meal cards` |

### 2. GREEN — Build the Feature

Implement the minimum UI and backend logic to make the e2e test pass. This may involve:

- Adding React components or modifying existing ones
- Wiring API calls via `src/lib/api/client.ts` or new endpoints
- Adding lib helpers in `src/lib/`
- Extending the reducer in `src/lib/plan-ui/state.ts`

Run the e2e test and the full vitest suite — both must pass.

### 3. REFACTOR — Clean Up on Green

With all tests passing, improve the code:

- Extract reusable components, hooks, or helpers
- Consolidate intercept patterns into `cypress/support/intercepts.ts`
- Improve test readability (extract custom commands, add fixtures)

Run both test suites after each change.

### 4. Repeat

Move to the next user-visible behavior. E2E cycles are naturally larger than unit cycles — each one may take 30-60 minutes. If longer, break the feature into smaller user-visible increments.

## Meal-Assistant-Specific Patterns

### Demo-mode smoke test

```typescript
// cypress/e2e/smoke/home.cy.ts
describe("Home page (demo mode)", () => {
  it("renders five meal cards, deals sidebar, and grocery list", () => {
    cy.visit("/");
    cy.contains(/this week's meals/i).should("be.visible");
    cy.findAllByLabelText(/Meal \d:/).should("have.length", 5);
    cy.findByLabelText(/this week's deals/i).should("be.visible");
    cy.findByLabelText(/grocery list/i).should("be.visible");
  });
});
```

### Intercepts with fixtures

```typescript
// cypress/support/intercepts.ts
export function interceptHomeApis() {
  cy.intercept("GET", "/api/recipes", { fixture: "recipes.json" }).as("getRecipes");
  cy.intercept("GET", "/api/deals", { fixture: "deals.json" }).as("getDeals");
  cy.intercept("POST", "/api/generate-plan", { fixture: "meal-plan.json" }).as("generatePlan");
}

// In a spec
import { interceptHomeApis } from "../../support/intercepts";

beforeEach(() => {
  interceptHomeApis();
});

it("waits for the plan to load before showing meal cards", () => {
  cy.visit("/");
  cy.wait("@generatePlan");
  cy.contains("Meal-A").should("be.visible");
});
```

### Testing user actions (regenerate, swap, thumbs)

```typescript
it("clicking regenerate calls /api/generate-plan again and replaces all meals", () => {
  interceptHomeApis();
  cy.intercept("POST", "/api/generate-plan", { fixture: "meal-plan-fresh.json" }).as(
    "regenerate",
  );

  cy.visit("/");
  cy.wait("@generatePlan");
  cy.findByRole("button", { name: /regenerate plan/i }).click();
  cy.wait("@regenerate");
  cy.contains("New-0").should("be.visible");
});
```

### Testing error states

```typescript
it("shows the error card with retry when /api/recipes 500s", () => {
  cy.intercept("GET", "/api/recipes", {
    statusCode: 500,
    body: { error: "GITHUB_PAT environment variable is required" },
  }).as("getRecipes");

  cy.visit("/");
  cy.contains(/something went wrong/i).should("be.visible");
  cy.findByRole("button", { name: /try again/i }).should("be.visible");
});
```

### Fixture organization

When adding new fixtures:

- Place in `cypress/fixtures/`
- Use descriptive filenames: `meal-plan.json`, `meal-plan-fresh.json`, `recent-logs.json`
- Structure mirrors the API response shape (the typed `MealPlan`, `Deal[]`, etc. from `src/lib/*/types.ts`)
- Keep fixtures minimal — only the fields the test asserts against
- Reuse demo-mode fixture data (`src/lib/demo/fixtures.ts`) as inspiration; the JSON shape is the same

## Structuring plans for E2E TDD

When TDD is requested alongside a plan, the plan unit defines **what** to build; e2e RED-GREEN-REFACTOR defines **how** to build it.

**Standard plan unit:**

```markdown
- U6. **Page composition + layout container**
  Goal: Wire usePlanState and the three components into src/app/page.tsx.
```

**E2E TDD-augmented (cycles live in commits / task tracker, not the plan body):**

```markdown
- U6. **Page composition + layout container**
  - RED (e2e): Home page renders five meal cards from demo plan
  - GREEN: Wire usePlanState + render 5 MealCard with isSwapping=generating
  - RED (e2e): Clicking regenerate replaces all five meal titles
  - GREEN: Add toolbar Button onClick={regenerate}
  - RED (e2e): Clicking thumbs-down reveals the skip-reason input below the grid
  - GREEN: Compute anyDownThumbs and conditionally render <Input>
  - REFACTOR: Extract LoadingState and ErrorState; consolidate intercepts in support/
  - RED (vitest): Skip-reason input is hidden when no thumbs are down (use meal-assistant:tdd-vitest)
  - GREEN: Tighten the conditional in page.tsx; update page.test.tsx
```

E2E TDD often triggers supplementary unit tests via `meal-assistant:tdd-vitest` for edge cases that are expensive to test at the e2e level.

## Discipline rules

1. **Never skip RED.** Run the Cypress test, watch it fail in the browser or headless output.
2. **Never ship a user-facing feature without an e2e test.** The e2e test IS the acceptance criteria.
3. **Never refactor on red.** Get to green first.
4. **Default to `DEMO_MODE=1` for E2E.** The page renders deterministically without GitHub / Flipp / Anthropic creds. Real-cred runs are a manual local exercise, not a CI baseline.
5. **Keep fixtures minimal and current.** When API shapes change, update fixtures — stale fixtures mask real bugs.
6. **Prefer `cy.findByRole()` / `cy.findByLabelText()` / `cy.contains()` over fragile CSS selectors.** Use `data-testid` only when no semantic role or label exists (the page uses `data-testid="kid-callout"`, `data-testid="deal-badges"`, `data-testid="skip-reason"` for exactly this purpose).
7. **Use `cy.intercept()` for API isolation** — e2e tests should not depend on live backend state for deterministic assertions, even when running with real creds available.
8. **Wait for the request, not for time.** Prefer `cy.wait("@alias")` over `cy.wait(2000)`.

See [anti-patterns.md](./references/anti-patterns.md) for common Cypress TDD mistakes to avoid.
