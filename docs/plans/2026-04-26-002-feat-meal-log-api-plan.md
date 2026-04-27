---
title: "feat: Meal log API + thumbs wiring (POST/GET /api/log, log-aware plan generation)"
type: feat
status: active
date: 2026-04-26
---

# feat: Meal log API + thumbs wiring (POST/GET /api/log, log-aware plan generation)

## Overview

Issue #68 closes the loop on weekly meal planning: thumbs up / down on each meal card persist to monthly markdown logs in the same private GitHub repo as the recipes, and the next week's plan generation reads the last 8 weeks of those logs to avoid recent repeats. This unblocks the only "ghost" element of #67's UI (the thumbs were rendered but no-op) and gives the LLM real signal about what the household actually cooks.

Three working surfaces:

1. **`POST /api/log`** — upsert one week's `{ cooked, skipped, skipReason? }` snapshot into `/log/YYYY-MM.md` in the recipes repo.
2. **`GET /api/log?weeks=8`** — return the last N week-entries across the most recent monthly files.
3. **Thumbs-aware UI** — the page fetches `/api/log` on mount alongside recipes/deals, posts on each thumb click, and shows an inline skip-reason input when thumbs-down is active.

Plan generation (`#66`) already reserved `MealLog[]` in its input shape; this issue replaces the placeholder `{ date, title }` with the real schema and updates the prompt to discriminate cooked vs skipped.

---

## Problem Frame

Without log persistence, two things break:

- The plan generator has no memory. It picks freely from the recipe library every week, ignoring what the household just ate. The issue calls this out as the headline win: "demonstrably avoids recent repeats."
- The thumbs controls in `src/components/meal-card.tsx` render but discard clicks (a `// TODO(#68)` marks the no-op handler in `src/app/page.tsx`).

Logs are stored in the same private GitHub repo as recipes so the user owns the data, can grep / version-control it, and so the same `GITHUB_PAT` secret governs read and write.

The format is per the issue spec: one markdown file per month at `/log/YYYY-MM.md`, with each weekly entry as a YAML frontmatter block. Multi-doc YAML lets every `--- ... ---` parse as its own document with `gray-matter` or `js-yaml` while keeping the file human-readable.

---

## Requirements Trace

- R1. Persist one weekly snapshot per `POST /api/log` to `/log/YYYY-MM.md` in the recipes repo, creating the file if absent.
- R2. The same `(week)` posted twice is an upsert: the second POST replaces the existing block for that week, not append-duplicates.
- R3. The log file is multi-doc YAML — each week is its own `--- ... ---` block in the order the file's blocks appear, sorted oldest → newest on each write.
- R4. `GET /api/log?weeks=N` (default 8) returns the most recent N week-entries across the `/log/` directory, sorted newest-first.
- R5. The plan generator's `MealLog` type is `{ week: string; cooked: string[]; skipped: string[]; skipReason?: string }` — placeholder `{ date, title }` is replaced.
- R6. The plan-generation prompt instructs the model to avoid recipes whose filenames appear in recent `cooked` and to consider recent `skipped` entries when ranking.
- R7. Thumbs-up / thumbs-down on a meal card POST the current week's full aggregate state (the meal moves into `cooked` or `skipped`; double-click toggles back to none). Loading state visible while posting.
- R8. Thumbs-down opens an inline freetext input under the card; submitting (or blurring) PATCHes the same week's block with `skipReason` set. Optional — empty submit is allowed.
- R9. `GITHUB_PAT` must have write (Contents: Read **and** Write) scope on the recipes repo. The README / CLAUDE.md call this out; runtime errors are mapped clearly when scope is insufficient.
- R10. `DEMO_MODE=1` short-circuits both `/api/log` routes: GET returns demo log fixtures, POST returns 200 with `X-Demo-Mode: 1` and writes nothing.
- R11. Concurrent-write conflicts (GitHub returns 409 on stale SHA) retry once with a fresh GET; second 409 surfaces as a 502.

---

## Scope Boundaries

- No log UI page or browse view — the file in the GitHub repo is the only canonical surface for reading historical data. Future issues can add an in-app history view if useful.
- No log deletion endpoint. Users can edit/delete files directly in the GitHub UI if needed.
- No multi-household / multi-user logging. Single-tenant just like the rest of the app.
- No "auto-log on plan acceptance" — only explicit thumb interactions write log entries. Avoids surprise writes.
- No timezone normalization. The client supplies the `week` string (`YYYY-MM-DD`); the server validates format only.
- No pagination on `GET /api/log` — `weeks` is the only knob, capped at 52.
- Pantry awareness (#69) and email (#70) remain out of scope.

---

## Context & Research

### Relevant Code and Patterns

- `src/lib/recipes/github.ts` — existing GitHub read pattern. Reuse: `Bearer` auth header, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: meal-assistant`, error classes `MissingEnvVarError`, `GitHubAuthError`, `GitHubNotFoundError`, `GitHubUpstreamError`. The new log module mirrors this style.
- `src/lib/recipes/parse.ts` — frontmatter parsing via `gray-matter`. The log parser uses a similar shape but for multi-doc YAML (split on `^---$` lines, parse each with `gray-matter`).
- `src/lib/deals/flipp.ts` — orchestrator pattern (per-store outcomes, partial success). The log "recent N weeks" orchestrator follows the same shape: list → fetch each → reduce.
- `src/lib/plan/types.ts` — `MealLog` placeholder lives here and is consumed by `src/lib/plan/prompt.ts:97` (`RECENT MEAL LOGS (avoid repeats):` block). The prompt must update when the type changes.
- `src/lib/plan/generate.ts` — `validateInput` checks `Array.isArray(body.logs)` only. New validation needs per-log shape checks.
- `src/lib/api/client.ts` — typed client wrappers. Adds `fetchRecentLogs(weeks?)` and `postMealLog(input)` here.
- `src/lib/plan-ui/state.ts` — current state machine has no concept of logs. Needs an additive shape: ready state gains `recentLogs: MealLog[]` and per-meal `thumb: "up" | "down" | null`. Skip reasons live on the week, not per-meal.
- `src/lib/plan-ui/use-plan-state.ts` — currently calls `fetchRecipes` + `fetchDeals` in parallel before generate. Adds `fetchRecentLogs()` to the same `Promise.all`.
- `src/components/meal-card.tsx` — `onThumbsUp` / `onThumbsDown` already accept `(index: number) => void`. Wiring extends those props to take the active state and a skip-reason text path.
- `src/lib/demo/fixtures.ts` — adds `DEMO_LOGS` fixture so demo-mode pages render with realistic recent activity.

### Institutional Learnings

- `docs/solutions/build-errors/` — no learnings directly applicable. The repo has no prior GitHub-write code.

### External References

- GitHub REST: [Repository contents — Create or update file contents (PUT)](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents). Body: `{ message, content (base64), sha?, branch? }`. `sha` is required when updating an existing file; absent when creating. 409 on stale `sha`.
- GitHub REST: [Get repository content (GET)](https://docs.github.com/en/rest/repos/contents#get-repository-content). Returns `{ content (base64), sha, ... }` for a file; an array for a directory.
- Multi-doc YAML: [YAML 1.2 §9.1](https://yaml.org/spec/1.2.2/#91-documents). `gray-matter` does not natively split multi-doc — we split on lines matching `^---\s*$` first.

---

## Key Technical Decisions

- **Multi-doc YAML, not a single `weeks: []` array.** Confirmed with the user. Matches the issue's example verbatim, keeps each week's diff small in `git log`, and means a hand-edit by the user in the GitHub UI does not require knowledge of the array structure.
- **Server-side multi-doc parsing is custom, not via a library.** `gray-matter` handles one frontmatter block; we split the file on `^---\s*$` boundaries first, then parse each chunk. Keeps the dependency surface flat (no new package).
- **PUT semantics: full-file replace, not append-only.** Each `POST /api/log` GETs the file (if any), upserts the week's block, sorts blocks by `week` ascending, re-serializes, and PUTs. This preserves R2 (week-level upsert) and R3 (sorted output) without server-side patching tricks.
- **`week` string format: `YYYY-MM-DD`, validated by regex.** No timezone interpretation. The client decides which day represents "the week" (we'll standardize on Monday but the server does not enforce). The string is used as both the YAML field value and the ordering key.
- **Recent-weeks reader fans out across the latest 2 monthly files.** 8 weeks fits in 2 months at most. Listing `/log/`, sorting filenames descending, fetching the top two, parsing both, taking the newest 8 entries is enough. Cap N at 52 to bound work.
- **Logs feeder is a new symmetric route.** `GET /api/log?weeks=8` returns `MealLog[]`. The page fetches it on mount and passes through to `POST /api/generate-plan`. Confirmed with the user; matches `/api/recipes` and `/api/deals` shape.
- **Thumbs are debounced per click into one POST that contains the entire current week's snapshot.** Each click computes the new `cooked` / `skipped` arrays from local state and POSTs the full payload. Server is the source of truth for the file but the client is the source of truth for the in-progress week.
- **Skip-reason capture: inline expansion, optional, last-write-wins per week.** Confirmed with the user. Single `skipReason` per week (the issue's body shape supports only one). UI: thumbs-down on any meal expands an inline input below the meal grid (or under the card; implementer's call) prefilled with the current week's reason. On blur or submit, POSTs the full snapshot with the new reason.
- **Concurrent-write retry on 409: one retry, then 502.** Two-tab edits or rapid clicks can stale the SHA. Single retry is the smallest correctness step that matters; deeper retry/queue is YAGNI for a single-user app.
- **`MealLog` shape change is breaking but blast radius is tiny.** Only the page (passes `[]`) and `validateInput` (only checks `Array.isArray`) and `prompt.ts` (just JSON-stringifies) consume it. All three are updated in U6 in one atomic step.
- **`DEMO_MODE` mirrors existing routes.** GET returns `DEMO_LOGS` (3-5 recent weeks of fixture data); POST is a no-op 200 with `X-Demo-Mode: 1`. No GitHub calls.
- **No log endpoint caching.** GitHub responses are small (a few KB per file). Next.js `fetch` Data Cache could be enabled later if pageload latency becomes an issue.
- **No GitHub App / branch / commit-author surface.** Single PAT, single default branch, commit author = whatever the PAT identity is. The PUT payload includes only `message` and `content` (and `sha` on update).

---

## Open Questions

### Resolved During Planning

- File format → multi-doc YAML, one `---` block per week (user-confirmed).
- Logs feeder path → new `GET /api/log` endpoint, page passes through (user-confirmed).
- Skip-reason UX → inline expansion under thumbs-down, optional (user-confirmed).
- Reading last 8 weeks → server fans out across the latest 2 monthly files, parses both, takes top 8.
- 409 conflicts → one retry, then 502.

### Deferred to Implementation

- Exact placement of the skip-reason input — directly under each card vs a single shared "Skip reason for this week" affordance below the meal grid. The single-shared form is simpler and matches the per-week semantics. Default to that; reconsider if the visual rhythm feels off.
- Commit message format on PUT (e.g., `chore(log): 2026-04-20 cooked=2 skipped=1` vs a plain `Update 2026-04.md`). The implementer picks something readable; not a contract.
- Whether to debounce per-click POSTs (e.g., 500 ms) to coalesce double-clicks. Defer until rapid clicks feel chatty in practice.
- Whether the YAML serializer should preserve any extra fields the user might hand-add to a block. Default: pass-through any fields outside the known set; do not strip.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

Lifecycle of one thumb click:

```
  user clicks thumbs-up on meal[i]
            │
            ▼
  client computes new {cooked, skipped} from local state for current week
            │
            ▼
  POST /api/log { week, cooked, skipped, skipReason? }
            │
            ▼
  server: GET /log/YYYY-MM.md (raw)
            │
            ├── 404 → start with empty file
            └── 200 → parse multi-doc, extract blocks
            │
            ▼
  server: replace-or-insert the {week} block, sort by week asc, serialize
            │
            ▼
  server: PUT contents { message, content (base64), sha? }
            │
            ├── 200/201 → return { ok: true }
            ├── 409 (stale sha) → re-GET, re-merge, re-PUT once → on second 409, return 502
            └── 4xx/5xx → map to errors in the same style as recipes/github.ts
```

File on disk after two writes in the same month:

```
---
week: 2026-04-13
cooked: [tacos, salmon]
skipped: []
---
---
week: 2026-04-20
cooked: [chicken-tacos]
skipped: [pasta-bake]
skip_reason: too tired, did takeout
---
```

Reading the last 8 weeks:

```
list /log/ → ["2026-04.md", "2026-03.md", "2026-02.md", ...]
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
              fetch top 2 monthly files

parse each into block[] → flatten → sort by week desc → take(N) → return
```

---

## Implementation Units

- U1. **Log types + multi-doc YAML parser/serializer**

**Goal:** Define the canonical `MealLog` shape and a pure parser/serializer that round-trips a multi-doc YAML log file.

**Requirements:** R3, R5.

**Dependencies:** None.

**Files:**
- Create: `src/lib/log/types.ts`
- Create: `src/lib/log/parse.ts`
- Create: `src/lib/log/parse.test.ts`

**Approach:**
- `MealLog` lives here as the single source of truth and is re-exported (or imported) by `src/lib/plan/types.ts`. The placeholder `{ date, title }` in `src/lib/plan/types.ts` is replaced with `import type { MealLog } from "@/lib/log/types"`.
- Frontmatter field names match the on-disk YAML: `week`, `cooked`, `skipped`, `skip_reason` (snake_case). The TypeScript shape uses camelCase: `skipReason`. Parser maps between them.
- `parseLogFile(source: string): MealLog[]` — splits the file on `^---\s*$` boundaries, drops empties, runs each chunk through `gray-matter`, validates field types, throws `LogParseError` (with file path + block index) on malformed entries.
- `serializeLogFile(entries: MealLog[]): string` — sorts by `week` ascending, formats each as a `--- ... ---` block, joins with `\n`. Round-trips the parser's output exactly (parsed → serialized → parsed yields the same array).
- `LogParseError` follows the `RecipeParseError` shape (a class with `filename` + message).

**Patterns to follow:**
- `src/lib/recipes/parse.ts` for `gray-matter` usage and the error class shape.
- `src/lib/recipes/types.ts` for the type-only file convention.

**Test scenarios:**
- Happy path: parses a 2-block file into `[{week, cooked, skipped, skipReason: undefined}, {week, cooked, skipped, skipReason: "..."}]` in document order.
- Happy path: round-trip — `parse(serialize(parse(source))) === parse(source)` (deep-equal).
- Happy path: `serialize` outputs blocks sorted by `week` ascending regardless of input order.
- Edge case: empty file → `[]`.
- Edge case: file with leading/trailing whitespace and blank lines between blocks parses cleanly.
- Edge case: a block with `skip_reason: ""` parses as `skipReason: undefined` (empty is treated as omitted, matching the recipes parser's "non-empty string or omitted" rule).
- Edge case: `cooked` or `skipped` may be empty arrays (`[]`) and round-trip.
- Error path: missing `week` field in a block → `LogParseError` mentioning block index.
- Error path: `week` not matching `^\d{4}-\d{2}-\d{2}$` → `LogParseError`.
- Error path: `cooked` or `skipped` not arrays of strings → `LogParseError`.

**Verification:**
- `npm run test -- src/lib/log/parse.test.ts` passes.
- The parser is fully pure (no `fetch`, no `process.env`).

---

- U2. **GitHub log writer/reader (single-file CRUD)**

**Goal:** Read and PUT a single `/log/YYYY-MM.md` file in the recipes repo with proper auth, error mapping, and 409 retry.

**Requirements:** R1, R2, R9, R11.

**Dependencies:** U1.

**Files:**
- Create: `src/lib/log/github.ts`
- Create: `src/lib/log/github.test.ts`

**Approach:**
- Re-export the existing GitHub error classes from `src/lib/recipes/github.ts` (or move them to a shared `src/lib/github/errors.ts` if the module starts to feel out of place — the implementer decides; default is re-export to avoid churn).
- `getLogFile(yearMonth: string): Promise<{ content: string; sha: string } | null>` — GETs `/repos/{repo}/contents/log/{yearMonth}.md`, returns `null` on 404, throws on other failures, decodes base64 content.
- `putLogFile(yearMonth: string, content: string, sha: string | null, message: string): Promise<void>` — PUTs the contents API with base64-encoded `content`, includes `sha` only when updating. Maps 401/403 to `GitHubAuthError`, 409 to `GitHubConflictError` (new class), other 4xx/5xx to `GitHubUpstreamError`.
- `upsertWeekEntry(week: string, cooked: string[], skipped: string[], skipReason: string | undefined): Promise<void>` — orchestrates: derive `yearMonth` from week, GET file, parse, replace-or-insert, serialize, PUT. On `GitHubConflictError`, retry once from the GET step. Second 409 surfaces as `GitHubConflictError`.
- Path is hard-coded `log/` (sibling to whatever `RECIPES_PATH` is set to). The log directory lives at the repo root regardless of where recipes live.

**Patterns to follow:**
- `src/lib/recipes/github.ts` for headers, env-var reading, error mapping shape.
- `mapGitHubError` helper — extend with a `"write"` context that maps 422 (validation) sensibly.

**Test scenarios:**
- Happy path (create): file does not exist → `getLogFile` returns `null` → `upsertWeekEntry` PUTs new content with no `sha`. Mock fetch verifies the PUT body has `content` (base64) and no `sha` field.
- Happy path (update): file exists with one block for week W1 → `upsertWeekEntry(W2, ...)` PUTs content containing both blocks sorted ascending, with the file's `sha` echoed.
- Happy path (replace): file exists with a block for week W1 → `upsertWeekEntry(W1, newCooked, newSkipped)` PUTs content where W1's block is replaced (not duplicated).
- Edge case: an empty existing file → upsert produces a one-block file.
- Error path: missing `GITHUB_PAT` → `MissingEnvVarError`.
- Error path: GET returns 401/403 → `GitHubAuthError`.
- Error path: PUT returns 401/403 → `GitHubAuthError` (typically the "PAT lacks write" path).
- Error path: PUT returns 422 → `GitHubUpstreamError` with status 422 (e.g., commit signature config issues).
- Integration: PUT returns 409 once → orchestrator re-GETs and re-PUTs and succeeds. Verifies fetch was called: GET, PUT, GET, PUT.
- Integration: PUT returns 409 twice → throws `GitHubConflictError` on second failure. No third attempt.
- Edge case: never interpolates `GITHUB_PAT` value into any error message (assert the PAT string never appears in caught error `.message`).

**Verification:**
- `npm run test -- src/lib/log/github.test.ts` passes with `fetch` mocked.
- A second pair of eyes can confirm by reading the source that read/write share the same auth/header surface as `recipes/github.ts`.

---

- U3. **Recent-weeks reader (cross-file orchestrator)**

**Goal:** Return the last N week-entries across the most recent monthly files.

**Requirements:** R4.

**Dependencies:** U1, U2.

**Files:**
- Create: `src/lib/log/recent.ts`
- Create: `src/lib/log/recent.test.ts`

**Approach:**
- `fetchRecentLogs(weeks: number): Promise<MealLog[]>` — lists `/log/`, sorts filenames matching `^\d{4}-\d{2}\.md$` descending, fetches the top 2 (enough for any sane `weeks ≤ 52`), parses each, flattens, sorts by `week` desc, takes `weeks` entries.
- Listing returns 404 (no `/log/` directory yet) → return `[]` rather than throwing. Logging is a write-creates-read pattern.
- Parsing failure on one file does not poison the whole result: the file with the parse error throws and surfaces as 502 to the caller. This is correctness-first; partial-success is more dangerous than failing the request when a log file is malformed.
- `weeks` is clamped to `[1, 52]`. Out-of-range → throw an `InvalidRequestError` (route maps to 400).

**Patterns to follow:**
- `src/lib/deals/flipp.ts` for the orchestrator structure and the per-store outcome shape (though here we don't need partial-success — all-or-nothing per file).

**Test scenarios:**
- Happy path: two files (`2026-04.md` with 3 weeks, `2026-03.md` with 4 weeks), `weeks=5` → newest 5 entries returned, sorted desc by `week`.
- Happy path: one file with 10 weeks, `weeks=8` → newest 8 entries.
- Edge case: `/log/` listing returns 404 → returns `[]`.
- Edge case: empty `/log/` directory → returns `[]`.
- Edge case: `weeks=8` but only 3 entries exist total → returns 3 entries.
- Edge case: directory contains non-matching files (`README.md`, `notes.md`) → ignored, only `YYYY-MM.md` files processed.
- Error path: `weeks` is `0`, `-1`, or `53` → throws `InvalidRequestError`.
- Error path: a file is malformed YAML → throws `LogParseError` (caller maps to 502).

**Verification:**
- Tests pass with mocked `fetch`.
- Behaves correctly when the directory is one file short of the 2-file fan-out (i.e., only 1 monthly file exists).

---

- U4. **`POST /api/log` route**

**Goal:** Validate the body, call `upsertWeekEntry`, map errors.

**Requirements:** R1, R2, R10, R11.

**Dependencies:** U2.

**Files:**
- Create: `src/app/api/log/route.ts`
- Create: `src/app/api/log/route.test.ts`

**Approach:**
- Body shape: `{ week: string; cooked: string[]; skipped: string[]; skipReason?: string }`. Validation:
  - `week` matches `^\d{4}-\d{2}-\d{2}$`.
  - `cooked` and `skipped` are arrays of non-empty strings.
  - `skipReason`, when present, is a string (allow empty → treated as omitted by the writer).
  - `cooked` and `skipped` may share members? Decision: no — the same recipe can't be both cooked and skipped in one week. Validation rejects with 400 if the intersection is non-empty.
- `DEMO_MODE=1` short-circuits before validation runs (returns 200 + `X-Demo-Mode: 1`, writes nothing). Wait — validate first so the client still gets shape errors in demo. Decision: validate first, then demo-mode short-circuit. Matches existing `/api/generate-plan` pattern.
- Error mapping:
  - `InvalidRequestError` → 400.
  - `MissingEnvVarError` → 500.
  - `GitHubAuthError` → 502 with hint to check `GITHUB_PAT` write scope.
  - `GitHubUpstreamError` → 502.
  - `GitHubConflictError` → 502 (after the orchestrator's single retry).
  - Unknown → 500 + `console.error`.

**Patterns to follow:**
- `src/app/api/generate-plan/route.ts` for the demo-mode-after-validation pattern and error class fan-out.
- `src/app/api/recipes/route.ts` for GitHub error mapping.

**Test scenarios:**
- Happy path: valid body → orchestrator called once with the right args → 200 response.
- Edge case: `DEMO_MODE=1` → 200, `X-Demo-Mode: 1`, orchestrator never called.
- Error path: malformed JSON body → 400.
- Error path: `week` not matching format → 400 with field name.
- Error path: `cooked` is not an array → 400.
- Error path: `cooked` contains a non-string → 400.
- Error path: `cooked` and `skipped` intersect → 400.
- Error path: `skipReason` is a non-string when present → 400.
- Error path: orchestrator throws `GitHubAuthError` → 502 + body mentions write scope.
- Error path: orchestrator throws `GitHubConflictError` (after retry) → 502.

**Verification:**
- `npm run test -- src/app/api/log/route.test.ts` passes with the orchestrator mocked.
- The route's body matches the issue's quoted contract verbatim.

---

- U5. **`GET /api/log` route**

**Goal:** Validate the `weeks` query, call the recent-weeks reader, map errors.

**Requirements:** R4, R10.

**Dependencies:** U3.

**Files:**
- Create: `src/app/api/log/route.ts` (modify — same file as U4)
- Modify: `src/app/api/log/route.test.ts`

**Approach:**
- `GET` is added to the same `route.ts` as `POST`. Reads `?weeks=` from the URL, defaults to 8, clamps to `[1, 52]`. Out-of-range → 400.
- Returns `MealLog[]` JSON.
- `DEMO_MODE=1` returns `DEMO_LOGS` (added in U6's demo fixture update) with `X-Demo-Mode: 1`.
- Error mapping reuses U4's mapping table.

**Patterns to follow:**
- `src/app/api/deals/route.ts` for query/env validation in a GET route.

**Test scenarios:**
- Happy path: `?weeks=5` → reader called with `5`, response is the returned `MealLog[]`.
- Happy path: no query → reader called with `8` (default).
- Happy path: `DEMO_MODE=1` → returns `DEMO_LOGS`, `X-Demo-Mode: 1`, reader never called.
- Error path: `?weeks=0` or `?weeks=99` → 400.
- Error path: `?weeks=foo` → 400.
- Error path: reader throws `GitHubAuthError` → 502.
- Error path: reader throws `LogParseError` → 502 with the file/block hint.

**Verification:**
- Tests pass.
- The endpoint URL shape matches the existing single-resource convention (`/api/log` not `/api/logs`).

---

- U6. **Plan generator wiring + page integration**

**Goal:** Replace the placeholder `MealLog` shape, update validation and the prompt, fetch logs in the page, and pass them into `POST /api/generate-plan`.

**Requirements:** R5, R6, R10.

**Dependencies:** U1, U5.

**Files:**
- Modify: `src/lib/plan/types.ts` (re-export real `MealLog` from `@/lib/log/types`)
- Modify: `src/lib/plan/generate.ts` (`validateInput` does per-log shape checks)
- Modify: `src/lib/plan/prompt.ts` (prompt mentions cooked/skipped explicitly)
- Modify: `src/lib/plan/prompt.test.ts`
- Modify: `src/lib/plan/generate.test.ts`
- Modify: `src/lib/api/client.ts` (add `fetchRecentLogs(weeks?)` and `postMealLog(input)`)
- Modify: `src/lib/api/client.test.ts`
- Modify: `src/lib/plan-ui/use-plan-state.ts` (parallel-fetch logs, store in state)
- Modify: `src/lib/plan-ui/state.ts` (ready state gains `recentLogs: MealLog[]`)
- Modify: `src/lib/plan-ui/state.test.ts`
- Modify: `src/lib/plan-ui/use-plan-state.test.tsx`
- Modify: `src/lib/demo/fixtures.ts` (add `DEMO_LOGS`)
- Modify: `src/lib/demo/fixtures.test.ts`

**Approach:**
- `MealLog` becomes `{ week: string; cooked: string[]; skipped: string[]; skipReason?: string }`. The placeholder comment in `src/lib/plan/types.ts` is removed.
- `validateInput` in `src/lib/plan/generate.ts` validates each log entry's shape (delegate to a `validateMealLog(log, path)` helper). Bad entries → `InvalidRequestError`.
- `prompt.ts:97` `RECENT MEAL LOGS (avoid repeats):` block stays but the prompt's picking rules section adds: "Recent `cooked` recipe filenames are recent repeats — avoid them. Recent `skipped` entries are signals the household didn't eat that meal — deprioritize them and consider their `skipReason` if present."
- `useEffect` in `usePlanState` adds `fetchRecentLogs(8)` to the parallel `Promise.all` alongside `fetchRecipes` + `fetchDeals`. The fetched logs go into the new state field and into the `generatePlan` body. Failure of `fetchRecentLogs` is degraded gracefully — log and continue with `[]` — so a fresh repo with no `/log/` doesn't block plan generation. (Actually: U3 already returns `[]` on listing-404, so this only matters for genuine auth/network failures.)
- Demo-mode fixture: 3 weeks of realistic-looking log entries; `DEMO_LOGS` returned by `GET /api/log` in demo mode.

**Execution note:** Touch the `MealLog` type first, then let the type errors guide each file's update. The blast radius is small but the change is breaking; following compiler errors is the safest path.

**Patterns to follow:**
- `src/lib/plan/generate.ts:validateInput` for the validation style.
- `src/lib/plan-ui/use-plan-state.ts` for hook shape and `Promise.all` usage.
- `src/lib/demo/fixtures.ts` for fixture conventions.

**Test scenarios:**
- Happy path: `validateInput` accepts a valid `logs` array.
- Edge case: `logs: []` continues to be accepted.
- Error path: `logs[0].week` malformed → `InvalidRequestError`.
- Error path: `logs[0].cooked` not an array → `InvalidRequestError`.
- Happy path: `prompt.ts` includes both the cooked and skipped descriptors in the user message.
- Happy path: `usePlanState` fetches logs in parallel and includes them in the generate-plan body.
- Edge case: `fetchRecentLogs` rejects → state still transitions to ready; logs default to `[]`; toast warns.
- Happy path: `DEMO_LOGS` exists with at least 3 entries; `fixtures.test.ts` asserts shape.

**Verification:**
- Full suite (`npm run test`) green.
- Generated prompt (existing prompt-snapshot tests, if any, or a new one) shows the cooked/skipped instruction text.

---

- U7. **Thumbs UI wiring (page + meal card + skip-reason input)**

**Goal:** Wire thumbs-up / thumbs-down on each meal card to post to `/api/log` with the current week's full snapshot, and add an inline skip-reason input.

**Requirements:** R7, R8.

**Dependencies:** U4, U6.

**Files:**
- Modify: `src/lib/plan-ui/state.ts` (per-meal `thumb: "up" | "down" | null`, `skipReason: string`)
- Modify: `src/lib/plan-ui/use-plan-state.ts` (add `setThumb(index, value)` and `setSkipReason(reason)` actions; each action also POSTs to `/api/log`)
- Modify: `src/lib/plan-ui/state.test.ts`
- Modify: `src/lib/plan-ui/use-plan-state.test.tsx`
- Modify: `src/components/meal-card.tsx` (thumbs reflect active state via prop; handlers receive `(index, nextValue)`; visual active style)
- Modify: `src/components/meal-card.test.tsx`
- Modify: `src/app/page.tsx` (state-derived thumb props, skip-reason input renders when any meal has thumbs-down)
- Modify: `src/app/page.test.tsx`

**Approach:**
- Thumbs state lives per-meal in the reducer's `ready` branch: `thumbs: Array<"up" | "down" | null>` of length 5. A `currentWeek` (ISO week-start, computed once at mount) is also carried.
- Toggling the same thumb deactivates it (both active arrays recompute and the POST goes out with the new arrays).
- Each thumb action triggers a debounced POST (e.g., a fire-and-forget call from the hook). Failure → toast error; state stays optimistic (we do not roll back the active thumb on failure — the user can retry by clicking again).
- The skip-reason input shows when any meal has `thumb === "down"`. It's a single input below the meal grid (not per-card) per the deferred decision. `onBlur` fires the POST with `skipReason` set on the same week. Empty submit OK.
- In demo mode, the thumb-click POST hits `/api/log` which returns 200 with `X-Demo-Mode: 1` — the UI feels live but nothing is written. Same UX as production.
- Compute `currentWeek` as Monday of the current ISO week (`YYYY-MM-DD`), client-side. A simple helper in `src/lib/plan-ui/week.ts` so the reducer can be a pure function.

**Patterns to follow:**
- `src/components/meal-card.tsx` for the existing thumbs button placement.
- `src/components/ui/input.tsx` and `src/components/ui/label.tsx` for the inline freetext input.

**Test scenarios:**
- Happy path: clicking thumbs-up on meal[2] when it's `null` → state becomes `up`, hook fires `postMealLog` with that week's `cooked` containing meal[2]'s recipe filename and `skipped` empty.
- Happy path: clicking thumbs-up on meal[2] when it's already `up` → state becomes `null`, POST fires with empty arrays.
- Happy path: clicking thumbs-down on meal[3] when meal[2] is `up` → POST fires with `cooked: [meal2-filename]` and `skipped: [meal3-filename]`.
- Happy path: skip-reason input appears when at least one thumb is `down` and disappears when none are.
- Happy path: typing in the skip-reason input + blur → POST fires with `skipReason` set.
- Edge case: clicking thumbs while `generating` is true is allowed (regenerate/swap don't block logging).
- Edge case: a `MealPlanMeal.title` that doesn't correspond to a known recipe filename — the meal card should still log the title (the prompt uses titles as the avoid-set; recipe filename ≠ title in general). Decision: log `meal.title` directly. The plan generator's prompt rule will state "avoid recipes whose titles appear in `cooked` or `skipped`."
- Error path: `postMealLog` rejects → toast appears; state remains optimistic.
- Integration: thumbs-down on meal[1] then typing reason "kid hated it" → final POST has `cooked: []`, `skipped: [meal1.title]`, `skipReason: "kid hated it"`.

**Verification:**
- All thumbs interactions covered by tests.
- Visual check in `npm run dev` with `DEMO_MODE=1`: thumb clicks visually toggle, skip-reason input appears under the grid when thumbs-down active, network panel shows `POST /api/log` requests with expected body.

---

## System-Wide Impact

- **Interaction graph:** Page mount now waits for three GETs (recipes, deals, logs) before generate. Logs failure degrades to `[]` so the critical path is unchanged. Each thumb click adds one POST per click.
- **Error propagation:** GET failures during init flow into `INIT_FAILED`. Thumb-click POST failures show toasts but don't unmount the plan. Generate-plan continues to surface 502s from upstream as before.
- **State lifecycle risks:** A POST in flight while another POST starts can race in GitHub (caught by 409 retry). A POST in flight while the user navigates away has no rollback — fire-and-forget, with the assumption that GitHub eventually wins. Acceptable for single-user.
- **API surface parity:** `/api/log` follows the existing route patterns. No header conventions break (`X-Demo-Mode` mirrors `/api/recipes` and `/api/deals`).
- **Integration coverage:** End-to-end thumb-click → POST → file content can be exercised in `src/app/page.test.tsx` with the orchestrator mocked. A real GitHub round-trip is out of scope for unit tests.
- **Unchanged invariants:** `/api/recipes`, `/api/deals`, `/api/generate-plan` shape and headers are unchanged. The `MealLog` field swap is internal — the page already passed `[]`, and now it passes real entries with the new shape.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `GITHUB_PAT` lacks write scope at runtime — only surfaces on first POST. | Map 401/403 from the PUT to a clear error message that names the PAT scope. Update `.env.example` and `CLAUDE.md` to mark the PAT as needing write. |
| Concurrent writes (two tabs, rapid clicks) cause stale-SHA 409s. | Single-retry orchestrator. Fire-and-forget on the client + idempotent upsert by week means at-least-once delivery is harmless. |
| `gray-matter` cannot natively parse multi-doc YAML. | Manual split on `^---\s*$` then per-block `gray-matter`. Round-trip tests lock in the format. |
| Breaking `MealLog` shape change touches multiple files. | All modifications live in U6 as one atomic step. Type errors guide the rest. |
| Skip-reason capture clutters the meal grid. | Single shared input below the grid (not per-card) keeps visual rhythm clean. Reconsider during implementation if it feels misplaced. |
| `/api/log` adds a new write surface — bad input could create garbage files. | Strict body validation (week regex, array-of-strings on cooked/skipped, intersection check). Server controls serialization, so malformed YAML in the file is impossible if the parser/serializer round-trip is correct. |
| GitHub API rate limit (5000/hr authenticated) — high if a user spams thumbs. | Single user, slow click cadence. No real risk. Mention as a deferred concern only. |
| The "demonstrably avoids recent repeats" success criterion is LLM-dependent. | Verify the prompt change ships and the generator receives logs. The model's behavior is its own; don't try to prove it deterministically in tests. |

---

## Documentation / Operational Notes

- Update `CLAUDE.md` `### Active Work` for #68 from descriptive to **Implemented**.
- Update `CLAUDE.md` `### Source Layout` to mention `src/lib/log/`.
- Update `CLAUDE.md` `### Environment Variables` for `GITHUB_PAT` to note "**write** access required once #68 ships."
- Update `.env.example` to mention the write requirement.
- No new env vars.
- The user must rotate their `GITHUB_PAT` to add Contents: Write scope before deploying. Surface this in the PR description.

---

## Sources & References

- Issue: [#68 — Meal logging: /api/log writes monthly log files to recipes repo](https://github.com/dancj/meal-assistant/issues/68)
- Upstream APIs (consumed and modified):
  - `src/app/api/generate-plan/route.ts` (consumed; `MealLog` shape change)
  - `src/lib/plan/prompt.ts` (modified — prompt mentions cooked/skipped)
- Existing GitHub patterns:
  - `src/lib/recipes/github.ts` (read-only patterns)
  - `src/lib/recipes/parse.ts` (frontmatter parsing)
- New module:
  - `src/lib/log/` (types, parse, github, recent)
- GitHub REST docs:
  - <https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents>
  - <https://docs.github.com/en/rest/repos/contents#get-repository-content>
