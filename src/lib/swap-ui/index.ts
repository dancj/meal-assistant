// Phase 2 shim — client-side swap-suggestion ranker + synthesis. Replace when
// /api/generate-plan ships per-slot swap suggestions and richer recipe metadata
// (protein, prep, lastMade) directly. The renderer's contract should stay
// stable; only this module's internals change.

export type { ProteinLabel, RankedSuggestion } from "./types";
export { extractProtein, extractProteinFromTitle, lastMadeDays } from "./synthesize";
export { swapSuggestions } from "./rank";
