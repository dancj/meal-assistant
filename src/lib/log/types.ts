export interface MealLog {
  /** ISO-style YYYY-MM-DD date representing the start of the week (typically Monday). */
  week: string;
  /** Recipe titles or filenames the household cooked that week. */
  cooked: string[];
  /** Recipe titles or filenames the household intentionally skipped that week. */
  skipped: string[];
  /** Optional freetext explaining the skips (single reason per week, last-write-wins). */
  skipReason?: string;
}
