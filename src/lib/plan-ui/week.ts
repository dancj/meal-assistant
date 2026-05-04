import { getMondayOfWeek } from "@/lib/week-ui";

/**
 * Returns the Monday of the ISO week containing `now`, formatted YYYY-MM-DD.
 * Thin wrapper over `getMondayOfWeek` for callers that need an ISO date string
 * (meal-log entries, email subject lines).
 */
export function currentWeekStart(now: Date = new Date()): string {
  return getMondayOfWeek(now).toISOString().slice(0, 10);
}
