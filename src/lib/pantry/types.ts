export interface Pantry {
  /** Always-on-hand items the model must never include on the grocery list. */
  staples: string[];
  /** Manually maintained freezer stock; freetext metadata (date/store) is preserved verbatim. */
  freezer: string[];
}
