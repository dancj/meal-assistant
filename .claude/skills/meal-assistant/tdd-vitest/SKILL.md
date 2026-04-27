---
name: meal-assistant:tdd-vitest
description: TDD workflow for unit, integration, and component tests using Vitest in the meal-assistant codebase. Use when implementing features, fixing bugs, or adding test coverage with a test-first approach. Triggers on "TDD", "test-driven", "test first", "write tests first", "red-green-refactor", "vitest TDD", or when the user requests test-driven development for unit, hook, route-handler, or component tests.
---

# Test-Driven Development with Vitest

Integrate red-green-refactor discipline into implementation using Vitest for unit and component tests in the meal-assistant codebase.

## Philosophy

The test is the first consumer of the API. If it is awkward to test, the design is wrong.

This skill follows the Classical (Chicago) school of TDD: prefer real objects over test doubles, assert on state and outcomes, mock only at system boundaries (`fetch` for GitHub / Flipp / Anthropic, `process.env` for config, `sonner` for non-blocking toasts).

## When to Use

**Apply TDD when:**

- Implementing a new pure utility (parser, validator, serializer, error class)
- Adding or modifying an API route handler under `src/app/api/*/route.ts`
- Building a new React component or hook in `src/components/` or `src/lib/plan-ui/`
- Adding a state-machine action to `src/lib/plan-ui/state.ts`
- Fixing a bug — reproduce it as a failing test before patching
- Designing a new lib module (e.g., `src/lib/log/`, `src/lib/recipes/`)

**Skip TDD when:**

- Pure config or boilerplate wiring (`vitest.config.ts`, `next.config.ts`, route file scaffolds with no logic yet)
- Pure styling and Tailwind class changes with no behavior change
- Trivial renames or one-line changes
- Updating fixtures, plan documents, or `CLAUDE.md`
- Exploratory spikes you intend to delete

## Activation

When this skill triggers:

1. **Detect the context.** Identify whether the code under test is:
   - A pure utility (parser, validator, type guard) → test directly with concrete inputs and outputs
   - An API route (`src/app/api/<name>/route.ts`) → call `GET`/`POST` with a real `Request`, assert on status / headers / body
   - A React component → use `@testing-library/react` with `render()`, `screen`, `fireEvent`
   - A custom hook → use `renderHook()` from `@testing-library/react`
   - A Next.js GitHub/Flipp/Anthropic-touching helper → mock `globalThis.fetch` with `vi.stubGlobal("fetch", ...)`
   - A reducer (e.g., `planReducer`) → call directly with concrete `PlanState` and `PlanAction` values
2. **If a plan exists or is being created**, follow the unit boundaries the plan defines and add red-green-refactor cycles inside each unit.
3. **If no plan exists,** begin the first RED step for the current task.

## Project Test Configuration

```bash
# Run tests
npm test                 # vitest run (one-shot)
npm run test:watch       # vitest (watch mode)
```

- **Default environment:** `node` (configured in `vitest.config.ts`)
- **Component / hook tests:** opt into jsdom **per file** with `// @vitest-environment jsdom` as the very first line. Do not flip the global default — pure-logic suites should stay on the faster Node environment.
- **Globals:** Enabled — `describe`, `it`, `expect` available without imports
- **Setup:** `src/test/setup.ts` (currently just `@testing-library/jest-dom/vitest` matchers)
- **Path alias:** `@/*` → `./src/*`

### Test file locations

Tests are **co-located** with the source they exercise. There is no `__tests__` directory.

| Source | Test |
|---|---|
| `src/lib/log/parse.ts` | `src/lib/log/parse.test.ts` |
| `src/lib/api/client.ts` | `src/lib/api/client.test.ts` |
| `src/components/meal-card.tsx` | `src/components/meal-card.test.tsx` |
| `src/lib/plan-ui/state.ts` | `src/lib/plan-ui/state.test.ts` |
| `src/lib/plan-ui/use-plan-state.ts` | `src/lib/plan-ui/use-plan-state.test.tsx` (jsdom) |
| `src/app/api/log/route.ts` | `src/app/api/log/route.test.ts` |
| `src/app/page.tsx` | `src/app/page.test.tsx` (jsdom) |

## The Cycle

For each behavioral increment:

### 1. RED — Write a Failing Test

Write a test that describes the expected behavior. Run `npm test -- <path>` and confirm the new test fails.

If the test passes immediately, investigate why. A test that was never red is not trustworthy.

**Test naming — describe behavior, not methods:**

| Bad | Good |
|---|---|
| `test_parseLogFile` | `parses a 2-block file in document order` |
| `test_handleClick` | `clicking thumbs-up dispatches setThumb with up` |
| `test_validate` | `throws InvalidLogRequestError when week is not YYYY-MM-DD` |

### 2. GREEN — Make It Pass

Write the minimum code to make the failing test pass. No cleverness. No optimization.

Run the full test suite — confirm all tests pass, not just the new one.

### 3. REFACTOR — Clean Up on Green

With all tests passing, improve the code:

- Remove duplication
- Improve naming
- Extract helpers that have earned their existence
- Simplify conditional logic

Run the test suite after each change. Never refactor on red.

### 4. Repeat

Move to the next behavioral increment. Each cycle should take minutes, not hours.

## Meal-Assistant-Specific Patterns

### Pure utility / parser tests

```typescript
import { describe, expect, it } from "vitest";
import { parseLogFile, LogParseError } from "./parse";

describe("parseLogFile", () => {
  it("parses a 2-block file in document order", () => {
    const got = parseLogFile(SOURCE, "2026-04.md");
    expect(got).toHaveLength(2);
    expect(got[0]).toEqual({ week: "2026-04-13", cooked: ["tacos"], skipped: [] });
  });

  it("throws LogParseError when week is malformed", () => {
    expect(() => parseLogFile("---\nweek: bad\ncooked: []\nskipped: []\n---\n", "x.md"))
      .toThrow(LogParseError);
  });
});
```

### API route handler tests

Routes export `GET` and/or `POST` that take a real `Request`. Pass a `Request` directly; assert on the `Response`.

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const upsertMock = vi.fn();
vi.mock("@/lib/log/github", async () => {
  const actual = await vi.importActual<typeof import("@/lib/log/github")>("@/lib/log/github");
  return { ...actual, upsertWeekEntry: (entry: unknown) => upsertMock(entry) };
});

beforeEach(() => {
  upsertMock.mockReset();
  delete process.env.DEMO_MODE;
});

it("returns 200 and calls upsertWeekEntry on a valid body", async () => {
  upsertMock.mockResolvedValue(undefined);
  const req = new Request("http://localhost/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week: "2026-04-20", cooked: ["tacos"], skipped: [] }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(upsertMock).toHaveBeenCalledTimes(1);
});
```

### `fetch`-mocking for GitHub / Flipp / Anthropic

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  process.env.GITHUB_PAT = "ghp_test";
  process.env.RECIPES_REPO = "owner/repo";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_PAT;
  delete process.env.RECIPES_REPO;
});

it("returns null on 404 from GitHub contents API", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("Not Found", { status: 404 })));
  expect(await getLogFile("2026-04")).toBeNull();
});
```

### Component tests (jsdom)

```typescript
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealCard } from "./meal-card";

describe("MealCard", () => {
  it("calls onSwap with the index when the swap button is clicked", () => {
    const onSwap = vi.fn();
    render(
      <MealCard
        meal={{ title: "Tacos", kidVersion: null, dealMatches: [] }}
        index={3}
        isSwapping={false}
        thumb={null}
        onSwap={onSwap}
        onThumbsUp={vi.fn()}
        onThumbsDown={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /swap meal 4/i }));
    expect(onSwap).toHaveBeenCalledWith(3);
  });
});
```

### Hook tests (jsdom + renderHook)

```typescript
// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const fetchRecipesMock = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return { ...actual, fetchRecipes: () => fetchRecipesMock() };
});

vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));

import { usePlanState } from "./use-plan-state";

it("transitions to ready after the parallel fetch resolves", async () => {
  fetchRecipesMock.mockResolvedValue([]);
  const { result } = renderHook(() => usePlanState());
  await waitFor(() => expect(result.current.state.status).toBe("ready"));
});
```

### Reducer tests (pure)

```typescript
import { describe, expect, it } from "vitest";
import { initialState, planReducer } from "./state";

describe("planReducer", () => {
  it("INIT_OK transitions loading -> ready", () => {
    const next = planReducer(initialState, {
      type: "INIT_OK",
      recipes: [],
      deals: [],
      recentLogs: [],
      plan: { meals: [], groceryList: [] },
      currentWeek: "2026-04-20",
    });
    expect(next.status).toBe("ready");
  });
});
```

## Mocking guidelines (Classical TDD)

- **Mock at boundaries:** `fetch` for GitHub/Flipp/Anthropic (use `vi.stubGlobal("fetch", ...)`), `sonner.toast` for non-blocking UX surface, `@/lib/api/client` exports when testing the page or hook end-to-end
- **Use real objects:** the reducer, parsers, validators, type guards, error classes, and your own React components composed with each other
- **Use `vi.fn()`** for callbacks and event handlers passed as props
- **Use `vi.spyOn()`** for observing calls without replacing implementation
- **Reset between tests:** `beforeEach(() => { vi.clearAllMocks(); })` or `afterEach(() => { vi.restoreAllMocks(); })`
- **`process.env`:** snapshot the original, mutate per-test, restore in `afterEach`. Do not use `vi.stubEnv` for `DEMO_MODE` / `GITHUB_PAT` etc. — direct mutation is the existing convention in this repo (see `src/lib/log/github.test.ts`)
- **Demo-mode tests:** set `process.env.DEMO_MODE = "1"` before importing the route, and assert that the upstream mock (e.g., `fetch`) was never called

## Restructuring plans for TDD

When TDD is requested alongside a plan, break each implementation unit into behavioral increments. Plan units already define **what**; TDD defines **how**.

**Standard implementation unit:**

```markdown
- U2. **GitHub log read/write + 409 retry**
  Goal: GET/PUT contents API + upsertWeekEntry orchestrator with single 409 retry.
  Files: src/lib/log/github.ts, src/lib/log/github.test.ts
```

**TDD-augmented unit (carry inside the same plan unit, not a new one):**

```markdown
- U2. **GitHub log read/write + 409 retry**
  - RED: getLogFile returns null on 404
  - GREEN: implement getLogFile with 404 -> null, otherwise base64-decode + return { content, sha }
  - RED: getLogFile throws GitHubAuthError on 401/403
  - GREEN: branch on status before parsing JSON
  - RED: upsertWeekEntry retries once on 409 then succeeds (4 fetches)
  - GREEN: wrap orchestrator in try/catch with one retry
  - REFACTOR: extract requireEnv + buildAuthHeaders to share with recipes/github.ts
```

The plan stays a decision artifact — RED/GREEN bullets live in commit messages, the task tracker, or as ephemeral working notes. Don't expand the plan body with them.

## Discipline rules

1. **Never skip RED.** Run the test, see it fail, read the failure message.
2. **Never commit a behavioral change without a test.** Config and boilerplate are exempt.
3. **Never refactor on red.** Get to green first.
4. **Keep cycles small.** If RED-GREEN takes more than 15-20 minutes, split the increment.
5. **Test behavior, not implementation.** Assert on what the user sees, what the route returns, or what the caller receives — not on private internals.
6. **Run the full suite before committing each unit.** Catch unintended breakage early.
7. **Co-locate the test file.** Same directory, `.test.ts` or `.test.tsx` suffix matching the source.

See [anti-patterns.md](./references/anti-patterns.md) for common mistakes to avoid.
