/**
 * Returns the Monday of the ISO week containing `now`, formatted YYYY-MM-DD.
 * No timezone interpretation — uses UTC components.
 */
export function currentWeekStart(now: Date = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = d.getUTCDay() || 7; // Monday=1, Sunday=7
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}
