// Phase 2 shim — derives day-row metadata from MealPlan + index until the
// /api/generate-plan contract returns richer per-meal data (theme, lastMade,
// protein, prepMinutes, calendar event). Replace the synthesis when the API
// ships those fields; the renderer's contract stays stable.

import type { MealPlanMeal } from "@/lib/plan/types";

export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI";

export type ThemeTag = "taco-tuesday" | "fish-friday";

export interface DayRowData {
  dayKey: DayKey;
  dateLabel: string;
  theme: { tag: ThemeTag; label: string } | null;
  kidNote: { who: string | null; text: string } | null;
  metadata: {
    protein: string | null;
    prepMinutes: number | null;
    daysAgo: number | null;
  };
}

const DAY_KEYS: readonly DayKey[] = ["MON", "TUE", "WED", "THU", "FRI"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Keyword lists for theme detection. Re-used by `src/lib/swap-ui/` for theme
 * boosting in suggestion ranking — keep this list as the single source of
 * truth so synthesis and ranking can't drift.
 */
export const TACO_KEYWORDS: readonly string[] = [
  "taco", "tex-mex", "quesadilla", "fajita", "enchilada", "burrito",
];
export const FISH_KEYWORDS: readonly string[] = [
  "fish", "salmon", "cod", "tilapia", "shrimp",
  "tuna", "sushi", "poke", "crab", "scallop", "halibut", "mahi",
];

/** UTC Monday of the ISO week containing `now`. Sunday rolls back 6 days. */
export function getMondayOfWeek(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = d.getUTCDay() || 7; // Monday=1, Sunday=7
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d;
}

/** Three-letter uppercase day code (MON, TUE, …, SUN). UTC-based. */
export function formatDayShort(date: Date): string {
  const codes = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
  return codes[date.getUTCDay()];
}

function formatMmmDay(date: Date): string {
  const m = MONTHS_SHORT[date.getUTCMonth()];
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${m} ${d}`;
}

/** Mon–Sun range formatted "Apr 27 — May 03". UTC-based. */
export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${formatMmmDay(weekStart)} — ${formatMmmDay(end)}`;
}

/**
 * ISO 8601 week number using the "Thursday of the week determines the year"
 * algorithm. Hand-rolled to avoid adding a `date-fns` dependency.
 */
export function weekIssueNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Move to Thursday of the same ISO week (day 4 in ISO numbering, where Mon=1).
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // Year of that Thursday is the ISO week-numbering year.
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diffMs = d.getTime() - yearStart.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  return Math.ceil((diffDays + 1) / 7);
}

function matchesAny(haystack: string, needles: readonly string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/**
 * Derive day-row metadata for the row at `index` (0=MON … 4=FRI) of the week
 * starting `weekStart`. Phase 2 shim — most fields are null until the API
 * contract ships richer per-meal data.
 */
export function synthesizeDay(
  meal: MealPlanMeal,
  index: number,
  weekStart: Date,
): DayRowData {
  const dayKey = DAY_KEYS[index] ?? "MON";

  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + index);
  const dateLabel = formatMmmDay(date);

  const titleAndKid = `${meal.title} ${meal.kidVersion ?? ""}`;
  let theme: DayRowData["theme"] = null;
  if (dayKey === "TUE" && matchesAny(titleAndKid, TACO_KEYWORDS)) {
    theme = { tag: "taco-tuesday", label: "Taco Tuesday" };
  } else if (dayKey === "FRI" && matchesAny(titleAndKid, FISH_KEYWORDS)) {
    theme = { tag: "fish-friday", label: "Fish Friday" };
  }

  const kidText = meal.kidVersion ?? "";
  const kidNote: DayRowData["kidNote"] =
    kidText.trim().length === 0 ? null : { who: null, text: kidText };

  return {
    dayKey,
    dateLabel,
    theme,
    kidNote,
    metadata: {
      protein: null,
      prepMinutes: null,
      daysAgo: null,
    },
  };
}
