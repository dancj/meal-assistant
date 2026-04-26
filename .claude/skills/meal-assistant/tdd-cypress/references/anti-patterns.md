# Cypress E2E TDD Anti-Patterns (meal-assistant)

Common mistakes that undermine test-driven development with Cypress in this codebase.

## Testing Implementation Instead of User Experience

**Problem:** Tests assert on internal state, reducer actions, or component prop names instead of what the user sees.

**Correction:** Assert on visible text, element states, and navigation outcomes. If the user can't see it, don't test it in e2e — push it down to a vitest unit test.

## Fragile Selectors

**Problem:** Tests use CSS class selectors or deeply nested DOM paths that break on styling changes.

**Example (bad):**

```typescript
cy.get(".bg-success.text-success-foreground").click();
cy.get("section > div > h3:nth-child(2)").should("have.text", "Aldi");
```

**Correction:** Use ARIA roles, labels, visible text, or `data-testid`.

```typescript
cy.findByRole("button", { name: /thumbs up/i }).click();
cy.findByRole("heading", { name: /aldi/i }).should("be.visible");
```

## Not Using `cy.intercept()` for API Isolation

**Problem:** Tests hit live `/api/recipes`, `/api/deals`, `/api/generate-plan`, `/api/log` and depend on GitHub / Flipp / Anthropic uptime + secrets.

**Correction:** Use `cy.intercept()` with fixtures for deterministic assertions. Use `DEMO_MODE=1` only as a fast happy-path baseline; intercept explicitly when you need a specific shape (an error response, a specific meal title, an empty list).

## Stale Fixtures

**Problem:** API response shapes change but fixtures aren't updated. Tests pass with stale data that no longer matches reality.

**Correction:** When `src/lib/*/types.ts` changes, sweep `cypress/fixtures/` for matching fixtures and update them in the same PR. The TypeScript types are the contract.

## Asserting Before the Page Has Loaded

**Problem:** The page does three parallel fetches + a generate-plan call before rendering meals. Asserting on meal text before the network calls resolve is flaky.

**Example (bad):**

```typescript
cy.visit("/");
cy.contains("Meal-A").should("be.visible"); // May fail before generate-plan resolves
```

**Correction:** Wait for the relevant request before asserting.

```typescript
cy.intercept("POST", "/api/generate-plan").as("generatePlan");
cy.visit("/");
cy.wait("@generatePlan");
cy.contains("Meal-A").should("be.visible");
```

Or rely on Cypress's automatic retry-until-found behavior with a generous timeout:

```typescript
cy.contains("Meal-A", { timeout: 10000 }).should("be.visible");
```

## Hardcoded Waits

**Problem:** Using `cy.wait(5000)` instead of waiting for specific conditions.

**Correction:** Wait for elements, network requests, or assertions. Cypress automatically retries assertions up to the default 4-second timeout — extend per-assertion if needed.

```typescript
// Bad
cy.wait(3000);
cy.findByText("Generated").should("exist");

// Good
cy.findByText("Generated", { timeout: 10000 }).should("be.visible");
```

## Writing E2E Tests for Unit-Level Logic

**Problem:** Using Cypress to test `parseLogFile`, the reducer's `SWAP_OK` action, or `validateInput` edge cases.

**Correction:** Test logic with Vitest (`meal-assistant:tdd-vitest`). Use Cypress only for user-visible workflows that span multiple components and API calls.

## Testing Too Many Workflows in One Spec

**Problem:** A single `it()` block tests page mount, regenerate, swap, thumbs-up, thumbs-down, skip-reason input, and grocery list assertion. When it fails, you don't know which step broke.

**Correction:** One workflow per `it()` block. Use `beforeEach()` for shared setup (intercepts, visit). Each test should be readable in isolation.

## Skipping RED in E2E (AI-Specific)

**Problem:** AI writes the Cypress test and the feature implementation simultaneously. The test was never observed to fail.

**Correction:** Write the Cypress test first. Run `npm run cypress:run`. Watch it fail (element not found, text not visible, request never made). Only then build the feature.

## Not Cleaning Up State Between Tests

**Problem:** Demo-mode is process-level state. If you flip env vars between specs, leakage is possible — but Cypress runs against an already-booted server, so the env is fixed for the whole run.

**Correction:** Choose `DEMO_MODE=1` for the whole e2e run via `npm run e2e` configuration. For tests that need a non-demo response shape, use `cy.intercept()` to override per-test rather than restarting the server.

## Over-Broad Error Suppression

**Problem:** Globally suppressing all uncaught exceptions hides real application errors.

**Correction:** Let application errors fail tests. Suppress only known third-party noise (e.g., ResizeObserver loop warnings). The current `cypress/support/e2e.ts` is minimal — extend deliberately.

## Using `data-testid` When a Role or Label Works

**Problem:** Sprinkling `data-testid` everywhere when ARIA roles, labels, or visible text would do.

**Correction:** Prefer `cy.findByRole()` / `cy.findByLabelText()` / `cy.contains()`. Reserve `data-testid` for cases where no semantic anchor exists or text is dynamic. The page already uses `data-testid="kid-callout"`, `data-testid="deal-badges"`, `data-testid="skip-reason"` for the genuine cases — match that bar.

## Hitting Real GitHub / Anthropic in CI

**Problem:** Cypress run in CI uses the real `GITHUB_PAT` and `ANTHROPIC_API_KEY` — flaky, slow, and burns API credits.

**Correction:** Configure CI to set `DEMO_MODE=1` before booting the dev server, OR intercept all `/api/*` calls in `beforeEach()`. Real-cred runs are local-dev only.

## Co-Locating Cypress Tests with Source

**Problem:** Putting `*.cy.ts` next to `*.tsx` source files. Cypress's spec pattern doesn't pick them up; vitest may try to load them.

**Correction:** Cypress specs live under `cypress/e2e/`. Vitest specs are co-located in `src/`. Don't mix.
