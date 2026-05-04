import { cn } from "@/lib/utils"

const PIP_COUNT = 14

export interface CadencePulseProps {
  /**
   * Days since the meal was last cooked. `null` renders an invisible
   * accessible placeholder so layout stays stable while the API has not yet
   * supplied `lastMade`.
   */
  daysAgo: number | null
}

export function CadencePulse({ daysAgo }: CadencePulseProps) {
  if (daysAgo === null) {
    return (
      <span
        aria-hidden="true"
        className="invisible inline-flex items-center h-3 w-24"
      />
    )
  }

  const filled = Math.min(Math.max(daysAgo, 0), PIP_COUNT)
  const empty = PIP_COUNT - filled

  return (
    <span className="inline-flex items-end gap-px h-3" data-slot="cadence-pulse">
      {Array.from({ length: PIP_COUNT }).map((_, i) => {
        // Fill the RIGHTMOST `filled` pips: index >= empty → forest, else paper-edge.
        const isForest = i >= empty
        return (
          <span
            key={i}
            data-slot="pip"
            className={cn(
              "block w-px h-full",
              isForest ? "bg-forest" : "bg-paper-edge",
            )}
          />
        )
      })}
      <span className="text-mono-sm text-ink-3 ml-2">{daysAgo}d ago</span>
    </span>
  )
}
