// Meal Assistant — TypeScript data model
// Drop into your Next.js project at e.g. lib/types.ts

export type Protein = 'fish' | 'chicken' | 'beef' | 'pork' | 'turkey' | 'shrimp' | 'veg';

export type Cuisine =
  | 'simple'
  | 'italian'
  | 'tex-mex'
  | 'asian'
  | 'mediterranean'
  | 'american';

export type ThemeTag = 'taco-tuesday' | 'fish-friday';

export type DayKey = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface Ingredient {
  qty: string;            // human-readable, e.g. "1.5 lb"
  name: string;
  store?: string;         // 'Aldi' | 'Safeway' | 'Costco' | string — free-form
}

export interface Meal {
  id: string;
  name: string;
  protein: Protein;
  cuisine: Cuisine;
  themes: ThemeTag[];
  prep: number;           // minutes
  source?: string;        // URL or human label ("Smitten Kitchen", "Mom")
  notes?: string;
  ingredients?: Ingredient[];
  photoUrl?: string;

  // Server-computed (read-only client side)
  lastMade?: string;      // ISO date
  timesThisMonth?: number;
  rating?: number;        // 0..5, derived from reactions
}

export type FamilyRole = 'adult' | 'kid';

export interface FamilyMod {
  /** Case-insensitive substring matched against `meal.name` */
  match: string;
  /** What to do — printed verbatim on the meal card */
  text: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
  age?: number;
  avatar: string;         // single character or emoji-free initials
  likes: string[];        // free-form tags: 'fish', 'cheese', 'spicy'
  dislikes: string[];
  allergens: string[];    // 'shellfish', 'tree-nuts', etc.
  mods: FamilyMod[];
}

export type EventKind = 'soccer' | 'dinner-out' | 'work' | 'travel' | 'other';
export type EventImpact = 'skip' | 'quick-meal' | 'shift-time' | 'none';

export interface CalendarEvent {
  kind: EventKind;
  label: string;
  impact: EventImpact;
  startsAt?: string;      // ISO timestamp
  source?: 'skylight' | 'google' | 'apple' | 'ical';
}

export interface DaySlot {
  day: DayKey;
  date: string;           // 'Apr 27'
  isoDate: string;        // '2026-04-27'
  mealId: string | null;
  theme: string | null;   // display label, e.g. 'Taco Tuesday'
  event: CalendarEvent | null;
}

export interface WeekPlan {
  id: string;
  weekStartIso: string;   // Monday
  slots: DaySlot[];       // 7 entries
  generatedAt: string;
  /** mealIds the user explicitly liked this week — preserved on regeneration */
  pinned: string[];
}

export type SyncProvider = 'skylight' | 'google' | 'apple' | 'ical';

export interface SyncState {
  connected: boolean;
  provider: SyncProvider;
  account?: string;
  lastSync?: string;      // ISO timestamp
  calendars: string[];
}

export interface CadenceRule {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
  /** Engine-specific config; shape per rule type */
  config?: Record<string, unknown>;
}

export interface MealReaction {
  mealId: string;
  userId: string;
  direction: 'up' | 'down' | null;
  updatedAt: string;
}

// ── Suggestion ranking input ────────────────────────────────────────────
export interface SwapContext {
  slot: DaySlot;
  week: WeekPlan;
  library: Meal[];
  family: FamilyMember[];
  reactions: MealReaction[];
  rules: CadenceRule[];
}

/**
 * Suggest 3 meals for a slot.
 * Ranking signals (in order):
 *   1. Not already used elsewhere this week.
 *   2. Matches slot.theme tag if present.
 *   3. Different protein than the meal being replaced.
 *   4. Family likes outweigh family dislikes (sum signals).
 *   5. Longest gap since last cooked (rotation freshness).
 */
export type SwapSuggester = (ctx: SwapContext) => Meal[];

// ── Grocery aggregation ─────────────────────────────────────────────────
export interface GroceryItem {
  qty: string;
  name: string;
  fromMealIds: string[];  // which meals this came from
  checked: boolean;
}

export interface GroceryList {
  weekId: string;
  byStore: Record<string, GroceryItem[]>;
}
