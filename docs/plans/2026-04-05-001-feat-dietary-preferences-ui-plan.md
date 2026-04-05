---
title: "feat: Persist dietary preferences in generate page UI"
type: feat
status: completed
date: 2026-04-05
---

# feat: Persist dietary preferences in generate page UI

## Overview

The `/generate` page already has a dietary preferences textarea wired to the API. The problem is that preferences are lost on page refresh — the user has to retype them every time. Persist them to localStorage so they carry across sessions, and add the `DIETARY_PREFERENCES` env var as a server-side default for the initial value.

## Problem Frame

Users can only reliably set dietary preferences via the `DIETARY_PREFERENCES` environment variable (used by the GitHub Actions cron). The UI textarea exists but starts empty every page load. For a household that always has the same base preferences ("no shellfish, kid: vegetarian alternative"), retyping every time is friction that defeats the purpose of the UI.

Related: dancj/meal-assistant#8

## Requirements Trace

- R1. Preferences textarea persists its value across page refreshes via localStorage
- R2. On first visit (no localStorage), the textarea pre-fills from `DIETARY_PREFERENCES` env var if set
- R3. User edits override the env var default and persist to localStorage
- R4. Clearing the textarea and generating a plan sends no preferences (existing behavior preserved)
- R5. Character count indicator shows remaining characters (max 500)

## Scope Boundaries

- No new settings page — the textarea on `/generate` is the only UI surface
- No database persistence for preferences — localStorage is sufficient for a single-household app
- No structured form (checkboxes, dropdowns) — free-text is intentionally flexible for Gemini
- No changes to the API endpoint — it already accepts `{ preferences: string }`

## Context & Research

### Relevant Code and Patterns

- **Generate page:** `src/app/generate/page.tsx` — already has preferences textarea (line 100-108) and sends preferences in request body (line 50)
- **localStorage pattern:** Same file uses `localStorage.getItem("meal-assistant-secret")` for auth token persistence (line 27-28) — follow this exact pattern
- **Env var:** `DIETARY_PREFERENCES` in `.env.example` — currently only read by GitHub Actions workflow, not by the app itself
- **API route:** `src/app/api/generate-plan/route.ts` — accepts optional `preferences` string, validates max 500 chars

### Institutional Learnings

- Recipe form uses `useState` + `onChange` for all fields, with disabled inputs during loading — follow this pattern
- Toast notifications via `sonner` for success/error feedback

## Key Technical Decisions

- **localStorage over database** — This is a single-household app. localStorage is simpler, requires no schema changes, and the data isn't sensitive. If multi-household support (#23) lands later, preferences would move to user profiles at that point.

- **Server-provided default via API route** rather than embedding the env var in client code — Create a lightweight `GET /api/preferences/default` endpoint that returns `{ preferences: string }` from `process.env.DIETARY_PREFERENCES`. This avoids exposing env vars to the client bundle and follows the existing API pattern.

## Open Questions

### Resolved During Planning

- **Should the env var be readable client-side via `NEXT_PUBLIC_`?** No — use a tiny API endpoint instead. Keeps env vars server-side and follows existing patterns.
- **Should we debounce localStorage writes?** No — the textarea is max 500 chars and `onChange` writes are cheap. Simplicity wins.

### Deferred to Implementation

- Exact key name for localStorage (suggested: `"meal-assistant-preferences"`)

## Implementation Units

- [x] **Unit 1: Add default preferences API endpoint**

**Goal:** Expose `DIETARY_PREFERENCES` env var to the client via a simple GET endpoint.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Create: `src/app/api/preferences/default/route.ts`
- Test: `src/app/api/preferences/default/route.test.ts`

**Approach:**
- Single GET handler that returns `{ preferences: process.env.DIETARY_PREFERENCES || "" }`
- No auth required — this is a non-sensitive default string
- No `requireAuth` — preferences are not secret data

**Patterns to follow:**
- `src/app/api/plan/current/route.ts` for route structure

**Test scenarios:**
- Happy path: `DIETARY_PREFERENCES` set → returns `{ preferences: "the value" }` with 200
- Happy path: `DIETARY_PREFERENCES` not set → returns `{ preferences: "" }` with 200

**Verification:**
- `GET /api/preferences/default` returns the env var value or empty string

- [x] **Unit 2: Persist preferences to localStorage and load defaults**

**Goal:** Save preferences on change, restore on page load, and fetch the env var default on first visit.

**Requirements:** R1, R2, R3, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `src/app/generate/page.tsx`
- Modify: `src/app/page.component.test.tsx` (if generate page tests exist there, otherwise new test)

**Approach:**
- On mount: check localStorage for saved preferences. If found, use them. If not, fetch `GET /api/preferences/default` and pre-fill the textarea.
- On textarea change: save to localStorage immediately (in the `onChange` handler or a `useEffect`)
- The existing `handleGenerate` already sends `preferences.trim()` to the API — no changes needed there
- Follow the existing `localStorage.getItem("meal-assistant-secret")` pattern at line 27-28

**Patterns to follow:**
- Auth secret localStorage pattern in same file (lines 26-28)

**Test scenarios:**
- Happy path: Preferences in localStorage → textarea pre-filled on mount
- Happy path: No localStorage, env var set → fetches default and pre-fills textarea
- Happy path: No localStorage, no env var → textarea starts empty
- Happy path: User types preferences → saved to localStorage
- Happy path: User clears textarea → localStorage updated to empty string, API called with no preferences
- Edge case: localStorage has value AND env var is set → localStorage wins (user override)

**Verification:**
- Typing in textarea and refreshing the page preserves the text
- First visit with `DIETARY_PREFERENCES` set shows the default
- Clearing and regenerating sends empty preferences

- [x] **Unit 3: Add character count indicator**

**Goal:** Show remaining characters below the textarea.

**Requirements:** R5

**Dependencies:** Unit 2

**Files:**
- Modify: `src/app/generate/page.tsx`

**Approach:**
- Add a small text below the textarea showing `{preferences.length}/500`
- Style with `text-xs text-muted-foreground` to match existing patterns
- No new component needed — inline in the generate page

**Patterns to follow:**
- Muted helper text pattern used in recipe form

**Test scenarios:**
- Happy path: Character count displays and updates as user types
- Edge case: At 500 characters, count shows `500/500`

**Verification:**
- Character count visible below textarea and accurate

## System-Wide Impact

- **API surface:** One new endpoint (`GET /api/preferences/default`) — lightweight, read-only, no auth
- **Existing behavior unchanged:** The `POST /api/generate-plan` body format stays the same. GitHub Actions cron still works identically.
- **localStorage key:** New key `meal-assistant-preferences` alongside existing `meal-assistant-secret`

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| localStorage not available (private browsing) | Graceful fallback — textarea works normally, just doesn't persist. Wrap in try/catch. |
| Env var contains sensitive info | `DIETARY_PREFERENCES` is dietary text ("no shellfish"), not credentials. Safe to expose via API. |

## Sources & References

- Related issue: dancj/meal-assistant#8
- Generate page: `src/app/generate/page.tsx`
- API route: `src/app/api/generate-plan/route.ts`
- Env example: `.env.example`
