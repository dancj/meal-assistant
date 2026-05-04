"use client"

import { CadencePulse, type CadenceState } from "@/components/cadence-pulse"
import { Pill } from "@/components/ui/pill"
import type { Recipe } from "@/lib/recipes/types"
import type { RankedSuggestion } from "@/lib/swap-ui"

export interface SwapSuggestionProps {
  suggestion: RankedSuggestion
  onSelect: (recipe: Recipe) => void
}

function daysToCadenceState(daysAgo: number | null): CadenceState {
  // SwapSuggestion always has the data in hand (recipe + recentLogs were
  // searched), so we never emit `unknown`. `unknown` is reserved for callers
  // that are still waiting on an API field.
  return daysAgo === null ? { kind: "never" } : { kind: "days", n: daysAgo }
}

export function SwapSuggestion({ suggestion, onSelect }: SwapSuggestionProps) {
  const { recipe, protein, daysAgo } = suggestion

  return (
    <button
      type="button"
      data-slot="swap-suggestion"
      data-testid="swap-suggestion"
      aria-label={`Swap to ${recipe.title}`}
      onClick={() => onSelect(recipe)}
      className="w-full flex items-start justify-between gap-4 py-4 text-left hover:bg-paper-2/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
    >
      <div className="flex flex-col gap-1.5">
        <h4 className="text-h4 text-ink leading-tight">{recipe.title}</h4>
        {protein !== null && (
          <div className="flex gap-2">
            <Pill variant="slate" size="sm">
              {protein}
            </Pill>
          </div>
        )}
      </div>
      <CadencePulse state={daysToCadenceState(daysAgo)} />
    </button>
  )
}
