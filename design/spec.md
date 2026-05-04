# Meal Assistant — Design Spec

> **Stack target:** Next.js (app router), React, TypeScript.
> **Design language:** see `tokens.json` and `design-system.md`.
> **Source of truth for visuals:** the prototype in `Meal Assistant.html`.

---

## 0. Product summary

A calm, family-scale meal planner. Plans the week, respects rotation rules (Taco Tuesday, Fish Friday, "no protein twice in 3 days"), reads a Skylight family calendar to skip nights when there's already a dinner plan, and prints per-kid modifications on the meal card so whoever is cooking can see them at a glance.

**Household model:** 2 adults + 2 kids. Names in the prototype are placeholders (Mara, Dan, Iris, Theo) — replace with real values from auth.

**Voice:** warm and friendly. Short sentences, sentence case, never sales-y, never apologetic. Examples that hit:
- "This week, we're cooking."
- "No dinner planned" (not "No meals scheduled")
- "Fits your rules"
- "Plan looks healthy"

---

## 1. Information architecture

```
/                         → Week (default)
/library                  → Library
/cadence                  → Cadence
/grocery                  → Grocery
/settings/family          → Family preferences
/settings/calendar        → Calendar sync
/library/new              → Add meal (modal route)
```

The top nav is always visible. Sync status (dot + last-sync time) lives top-right.

---

## 2. Screens

### 2.1 Week (`/`)

The hero. A vertical timeline of the 7 days of the current week.

**Header**
- Eyebrow: `"Apr 27 — May 03 · Issue 17"` — date range + week number.
- Display title: `"This week, we're cooking."` (display token, balance-wrapped).
- Right-side actions: `Regenerate` (ghost button) and `Email this` (primary button).

**Day rows** — one row per day, separated by hairline rules. Three columns:

| col | width | content |
|-----|-------|---------|
| 1   | 120px | `MON` (mono) over `Apr 27`; theme pill underneath if applicable |
| 2   | flex  | meal name (h2), metadata row, event chip, kid-mod notes |
| 3   | 320px | thumb-up / thumb-down toggle, then `Swap meal` |

**Skip nights** — when an event has `impact: "skip"`, render the meal slot italic and muted: *"No dinner planned"*, with the event chip below. Replace actions with a single `Plan a meal` ghost button.

**Metadata row** (below meal name, mono caption):
`{protein} · {prep} min · {N}d ago` (the "Nd ago" is an inline `<CadencePulse>`).

**Kid mods** — for each kid whose `mods[].match` substring is in the meal name, render a `<KidNote>` (amber chip with name pill on the left).

**Event chip** — only render when `event && !theme` to avoid a doubled visual.

**Theme pill** — only Tuesday and Friday currently. Pill is forest-soft + forest-2; icon prefixed (`taco` or `fish`).

**Reactions** — clicking the same direction twice clears it. Persist per `mealId` (not per slot — feedback is about the meal, not the day).

**Swap CTA** — opens the right-side drawer (see §3.1).

### 2.2 Library (`/library`)

Editorial listing of every meal. Header: eyebrow with count + cuisine grouping mode, h1 `"Meals we make"`, primary action `Add meal`.

Meals grouped by `cuisine`. Each cuisine block: h3 with the name (capitalized) + count, then a 2-column rule-divided list. Each row: meal name (h4), mono metadata `{protein} · {prep}m · {source}`, optional italic notes, right-aligned `<CadencePulse>`.

No cards, no boxes. The hairline rules do all the work.

### 2.3 Cadence (`/cadence`)

Two-up: protein mix (left) + active rules (right), then a stacked history of the last 3 weeks.

**Protein mix** — a list of horizontal progress bars, one per protein, sorted desc. Bar uses `forest`; track uses `paper-edge`. Trailing mono count.

**Active rules** — list of cards with a green check tile + title + detail. Tap to edit (not yet implemented).

**Last 3 weeks** — for each historical week, eyebrow `"Week of Apr 20"`, then an inline run of `{day} {meal name}` separated by gaps. Skip nights are simply absent.

### 2.4 Grocery (`/grocery`)

3-column layout, one column per store. Each store has h3 store name and a list of items with checkbox + mono qty + name. Items separated by hairlines, no card.

Right side of the header has an `Email this list` primary button.

### 2.5 Settings — Family (`/settings/family`)

Left rail with two sections (`Family`, `Calendar`). Right pane:

For each family member: forest-soft avatar tile (initial), name + role eyebrow, then a 2-col grid:
- `Likes` — forest pills.
- `Dislikes` — rose pills.
- `Allergens` (if any) — amber pills.
- `Standing mods` (if any) — list of `{when "match"} {text}` lines.

Each member has a small `Edit` ghost button. Bottom of the pane: `+ Add family member`.

**Behavior:** mods are surfaced on the Week screen via `modsForMeal()` — a kid's mod whose `match` is a substring of the meal name renders as a `<KidNote>`. Likes/dislikes inform `swapSuggestions()` ranking (not yet implemented in prototype, but specced).

### 2.6 Settings — Calendar (`/settings/calendar`)

A single connection card:
- Skylight icon tile (ink filled), provider name, account email or "Not connected".
- Right side: `Disconnect` (when connected) or `Connect` (when not).
- When connected, divider then:
  - Last sync row: title + mono time + `Sync now` ghost button on the right.
  - Synced calendars: row of slate pills.

Footer caption (ink-3): "Events are read-only. We use them to suggest skip nights and quick-meal days — never to modify your calendar."

**Skylight integration note for engineering:** Skylight does not have a public OAuth API at time of writing. Integration path is likely (a) iCal feed URL paste, or (b) Google/Apple calendar shared with Skylight. Treat the UI as provider-agnostic — the `provider` field in `SyncState` is the only thing that needs to change to support Google/Apple/iCloud.

### 2.7 Add Meal (`/library/new`, modal)

Centered card, 640px wide, max 90% viewport height. Header: eyebrow `"New meal"` + h3 title `"Add to your library"`. Sticky footer with `Cancel` + `Save meal`.

Fields (in order):
1. **Name** (text)
2. **Source URL** (text) + **Cuisine** (select) — side by side
3. **Themes** (multi-select toggle buttons — Taco Tuesday, Fish Friday)
4. **Ingredients** (mono textarea, hint: "One per line — used for grocery generation")
5. **Notes** (textarea, hint: "Cooking tips, family lore, who likes it")
6. **Photo** (drop zone)

All fields are optional except name. Saving routes back to `/library`.

---

## 3. Components

### 3.1 SwapDrawer (right-side, 420px)

Opens when user clicks `Swap` on any meal row. Backdrop fades in over the page; drawer slides in from the right (220ms).

- Header: eyebrow with day + date, h3 "Choose a swap", caption "Replacing: {current name}", close button.
- Body: eyebrow "Fits your rules" with sparkle icon, then 3 suggestion buttons separated by hairlines:
  - Meal name (h4)
  - Slate pills: protein, prep time
  - `<CadencePulse>` showing last-made
- Tapping a suggestion replaces the meal and closes the drawer (220ms reverse).

**Suggestion ranking** (`swapSuggestions(daySlot)`):
1. Exclude meals already used elsewhere in the current week.
2. Boost meals whose `themes` include the slot's theme tag.
3. Boost meals with a *different* protein than the current slot's meal.
4. Future: weight by family member likes/dislikes (currently not factored).
5. Take top 3.

### 3.2 KidNote (amber chip)

`<KidNote note={{ who, text }} />` — name pill on the left, free text on the right. Background `amber-soft`, text `amber-ink`. Used on Week meal rows and (future) on shopping list per-meal annotations.

### 3.3 CadencePulse

14 vertical pips. The N most-recent days are filled forest, older days are paper-edge. Trailing mono "Nd ago" caption. Communicates rotation gap visually.

### 3.4 EventChip

Pill component. `pill-slate` for skip events, `pill-amber` for impact events (quick-meal, time-shift). Icon prefix maps to event kind (`soccer`, `dinner-out`, `calendar`).

### 3.5 Standard buttons

- `btn` — pill, paper bg, paper-edge border, ink text.
- `btn-primary` — forest bg, paper text.
- `btn-ghost` — transparent border.
- `btn-sm` — 12px font, tighter padding.
- `btn-icon` — square 28×28.

All buttons share the same hover/press transitions defined in tokens.

---

## 4. Data model (suggested TypeScript)

```ts
type Protein = 'fish' | 'chicken' | 'beef' | 'pork' | 'turkey' | 'shrimp' | 'veg';
type Cuisine = 'simple' | 'italian' | 'tex-mex' | 'asian' | 'mediterranean' | 'american';
type ThemeTag = 'taco-tuesday' | 'fish-friday';

interface Meal {
  id: string;
  name: string;
  protein: Protein;
  cuisine: Cuisine;
  themes: ThemeTag[];
  prep: number;             // minutes
  source?: string;          // recipe origin (URL or human label)
  notes?: string;
  ingredients?: Ingredient[];
  photoUrl?: string;
  // server-computed:
  lastMade?: string;        // ISO date
  timesThisMonth?: number;
  rating?: number;
}

interface Ingredient { qty: string; name: string; store?: string; }

interface FamilyMember {
  id: string;
  name: string;
  role: 'adult' | 'kid';
  age?: number;
  avatar: string;
  likes: string[];
  dislikes: string[];
  allergens: string[];
  mods: { match: string; text: string }[]; // substring match against meal.name
}

interface DaySlot {
  day: 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN';
  date: string;             // 'Apr 27'
  isoDate: string;
  mealId: string | null;
  theme: string | null;     // display label; tag derived from this string
  event: CalendarEvent | null;
}

interface CalendarEvent {
  kind: 'soccer' | 'dinner-out' | 'work' | 'travel' | 'other';
  label: string;
  impact: 'skip' | 'quick-meal' | 'shift-time' | 'none';
  startsAt?: string;
}

interface SyncState {
  connected: boolean;
  provider: 'skylight' | 'google' | 'apple' | 'ical';
  account?: string;
  lastSync?: string;        // ISO timestamp
  calendars: string[];
}

interface CadenceRule {
  id: string;
  label: string;
  detail: string;
  // server-side enforcement schema TBD
}
```

---

## 5. Behaviors & state

### 5.1 Persistence
- Reactions (`thumb up/down`) live on `meal_ratings` keyed by `(userId, mealId)`. They affect future suggestion ranking but never automatically remove a meal from the library.
- Swapping a meal writes to a `week_plan` record (one per week). Server returns regenerated grocery list.
- "Email this" / "Email this list" — use Resend or similar; render a server-side text+HTML email mirroring the screen content.

### 5.2 Week regeneration
"Regenerate" should preserve any meal the user has explicitly reacted to (👍 sticks, 👎 forces a swap). Always preserve skip nights derived from calendar events.

### 5.3 Calendar polling
Pull on open + every 15 min while the tab is focused. Surface `lastSync` next to the dot. The "Sync now" button forces a refresh.

### 5.4 Mod resolution
Mods are matched case-insensitive substring on meal name. Future improvement: structured tags (e.g. `mod: { match: { ingredient: 'beans' }, text: '...' }`).

---

## 6. Accessibility

- Hit targets ≥ 32px (we use 28px icon buttons — bump to 32 on touch).
- `aria-label` on every icon-only button. The prototype tags `Like`, `Dislike`, `Close`.
- Keyboard: drawer should trap focus and close on `Esc`.
- Color: forest-on-paper passes AA. Amber-ink on amber-soft passes AA at 12.5px+.
- Motion: respect `prefers-reduced-motion` — collapse all 220ms slides to instant + 80ms fade.

---

## 7. Out of scope (next phase)

- Per-meal photo upload (currently a stub).
- Multi-week planning view.
- Recipe instruction view.
- Meal scaling for guests.
- Pantry / inventory.
- Push to family calendar (one-way read for now).

---

## 8. Implementation notes for Claude Code

1. **Tokens first.** Convert `tokens.json` to CSS custom properties on `:root`. Don't reach into the prototype's class names — the visual contract is the tokens.
2. **Component library.** The components in §3 are the floor. Build them as headless + styled in Next.js using the tokens.
3. **Routes.** Use the app router. Settings is a nested layout with the left rail. Add Meal is an intercepted/parallel route on `/library`.
4. **Server state.** Wrap meal/week/family/sync in server components; reactions/swaps via server actions.
5. **Auth + accounts.** Out of scope for this design pass — prototype assumes a logged-in family.
6. **Avoid:** drop shadows on cards (we use 1px hairlines), gradients, generic emoji food icons (use the custom Icon set), and the words "delicious" or "yummy" anywhere in the UI.
