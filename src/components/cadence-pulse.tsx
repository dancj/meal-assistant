import { cn } from "@/lib/utils"

const PIP_COUNT = 14

/**
 * Tagged-union encoding for the cadence-pulse caption:
 *
 *   - `unknown` — data is not yet available (API hasn't shipped `lastMade`).
 *     Renders an invisible, screen-reader-hidden placeholder so layout stays
 *     stable while the consumer has nothing to show.
 *   - `never`   — recipe has no matching log entry. Distinct from `unknown`
 *     because it's a real domain answer ("we've never cooked this"), not a
 *     deployment fact.
 *   - `days`    — recipe was last cooked `n` days ago. Newest-on-the-right
 *     visualization fills the rightmost `clamp(n, 0, 14)` pips forest.
 */
export type CadenceState =
  | { kind: "unknown" }
  | { kind: "never" }
  | { kind: "days"; n: number }

export interface CadencePulseProps {
  state: CadenceState
}

function renderPips(filled: number) {
  // Newest-on-the-right per design/spec.md §3.3 — index >= empty → forest pip.
  const empty = PIP_COUNT - filled
  return Array.from({ length: PIP_COUNT }).map((_, i) => (
    <span
      key={i}
      data-slot="pip"
      className={cn(
        "block w-px h-full",
        i >= empty ? "bg-forest" : "bg-paper-edge",
      )}
    />
  ))
}

export function CadencePulse({ state }: CadencePulseProps) {
  if (state.kind === "unknown") {
    return (
      <span
        aria-hidden="true"
        className="invisible inline-flex items-center h-3 w-24"
      />
    )
  }

  if (state.kind === "never") {
    return (
      <span className="inline-flex items-end gap-px h-3" data-slot="cadence-pulse">
        {renderPips(0)}
        <span className="text-mono-sm text-ink-3 ml-2">never</span>
      </span>
    )
  }

  const filled = Math.min(Math.max(state.n, 0), PIP_COUNT)

  return (
    <span className="inline-flex items-end gap-px h-3" data-slot="cadence-pulse">
      {renderPips(filled)}
      <span className="text-mono-sm text-ink-3 ml-2">{state.n}d ago</span>
    </span>
  )
}
