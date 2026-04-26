# Vitest TDD Anti-Patterns (meal-assistant)

Common mistakes that undermine test-driven development with Vitest in this codebase.

## Testing Implementation Instead of Behavior

**Problem:** Tests coupled to private helpers, exact regex variants, or specific YAML formatting that don't matter to callers. Refactoring breaks tests even when behavior is unchanged.

**Example (bad):**

```typescript
// Tests private formatYamlValue helper through the parser's internals
expect(serializeLogFile([entry])).toMatch(/cooked: \[tacos, salmon\]/);
```

**Correction:** Round-trip the actual contract.

```typescript
expect(parseLogFile(serializeLogFile([entry]), "x.md")).toEqual([entry]);
```

## Forgetting `// @vitest-environment jsdom`

**Problem:** Component or hook test imports `@testing-library/react`, fails with `document is not defined` because the global Vitest environment is `node`.

**Correction:** Add `// @vitest-environment jsdom` as the very first line of any file that uses `render` or `renderHook`. Do not flip the global default — pure-logic suites should stay on Node.

## Mocking Everything

**Problem:** Every dependency is mocked. Tests pass but the system doesn't actually work. Common when testing the page or hook layer.

**Example (bad):**

```typescript
vi.mock("@/lib/api/client");
vi.mock("@/lib/plan-ui/state");
vi.mock("@/components/meal-card");
// Now testing nothing real
```

**Correction (Classical approach):** Mock at boundaries — `fetch` for GitHub / Flipp / Anthropic, `@/lib/api/client` only when you want to drive the page from above. The reducer, components, and parsers stay real.

## Skipping the Refactor Step

**Problem:** RED-GREEN without REFACTOR. Code works but accumulates duplication and tangled logic.

**Correction:** After each GREEN, ask: duplication? naming? emerging abstraction? Even "no changes needed" is a valid refactor step.

## Testing Framework or Library Code

**Problem:** Testing that React renders a component, that Next.js parses a `Request`, that `gray-matter` returns frontmatter, or that Vitest matchers function.

**Correction:** Test your logic — business rules, validation, conditional rendering, error mapping. Trust the framework.

## Gold-Plating Assertions

**Problem:** Over-specified assertions that check every prop, every CSS class, every attribute.

**Example (bad):**

```typescript
expect(screen.getByRole("button")).toHaveAttribute(
  "class",
  "px-2.5 h-7 gap-1 rounded-... bg-secondary text-secondary-foreground ...",
);
```

**Correction:** Assert on what matters to behavior.

```typescript
expect(screen.getByRole("button", { name: /swap meal 1/i })).toBeEnabled();
```

## Snapshot Overuse

**Problem:** Using `toMatchSnapshot()` as a substitute for behavioral assertions. Snapshots test structure, not behavior, and break on every CSS or copy change.

**Correction:** Use snapshots sparingly. For UI, assert on specific elements and visible text. For prompts (`src/lib/plan/prompt.ts`), prefer string-contains checks for the load-bearing instruction lines, not full-prompt snapshots.

## Not Cleaning Up Mocks

**Problem:** `vi.fn()` or `vi.stubGlobal("fetch", ...)` state leaks between tests, causing intermittent failures.

**Correction:**

```typescript
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
```

For `process.env`, snapshot the original in `beforeEach` and restore in `afterEach` — see `src/lib/log/github.test.ts` for the pattern.

## Over-Implementing on GREEN (AI-Specific)

**Problem:** AI writes the complete, optimized solution in the GREEN step instead of the minimum code to pass.

**Correction:** In GREEN, write only what the failing test demands. The next test forces generalization. If you find yourself writing branches not yet exercised, delete them and write the next RED first.

## Mirror Tests (AI-Specific)

**Problem:** Tests re-implement the production code formula instead of using concrete values.

**Example (bad):**

```typescript
// Production: skipReason set when non-empty
expect(parseLogFile(src, "x.md")[0].skipReason).toBe(reason !== "" ? reason : undefined);
```

**Correction:** Use concrete values.

```typescript
expect(parseLogFile(srcWithEmptyReason, "x.md")[0].skipReason).toBeUndefined();
expect(parseLogFile(srcWithReason, "x.md")[0].skipReason).toBe("kid was sick");
```

## Skipping RED Verification (AI-Specific)

**Problem:** AI writes the test and the implementation in the same step without verifying the test fails first.

**Correction:** Always run `npm test -- <path>` before writing implementation. See the failure. Read the message. Only then write GREEN.

## Mocking `process.env` Wrong

**Problem:** Tests that don't restore `DEMO_MODE` / `GITHUB_PAT` between tests cause leakage between unrelated suites.

**Correction:** Snapshot in `beforeEach`, restore in `afterEach`:

```typescript
const originalDemo = process.env.DEMO_MODE;
beforeEach(() => { delete process.env.DEMO_MODE; });
afterEach(() => {
  if (originalDemo === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemo;
});
```

Or simply `delete process.env.DEMO_MODE` in `beforeEach` since the default expected state is unset.

## Calling Routes via `fetch("/api/...")` Inside Tests

**Problem:** Trying to test a Next.js route by hitting a localhost URL — the dev server isn't running in `vitest`.

**Correction:** Import the handler directly and call it with a `Request`:

```typescript
import { POST } from "@/app/api/log/route";
const res = await POST(new Request("http://localhost/api/log", { method: "POST", body: "{...}" }));
expect(res.status).toBe(200);
```

## Asserting on Headers Using `Object.fromEntries`

**Problem:** `Headers` instances iterate but `Object.fromEntries` may merge multi-value headers in surprising ways.

**Correction:** Use `res.headers.get("X-Header")`. Direct, deterministic, matches how the route emits them.

## Re-Reading Files in Tests

**Problem:** Tests that read fixtures with `fs.readFileSync` add filesystem coupling and slow test startup.

**Correction:** Define fixture data inline as TypeScript constants (see `src/lib/log/github.test.ts` `SAMPLE_FILE`). Filesystem reads are fine for `cypress/fixtures/*` (consumed by Cypress at runtime) but not for vitest unit tests.
