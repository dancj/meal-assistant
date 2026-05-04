"use client"

import { RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react"

import { DayLabel } from "@/components/day-label"
import { KidNote } from "@/components/kid-note"
import { Button } from "@/components/ui/button"
import type { Thumb } from "@/lib/plan-ui/state"
import type { MealPlanMeal } from "@/lib/plan/types"
import { cn } from "@/lib/utils"
import type { DayRowData } from "@/lib/week-ui"

export interface MealRowActions {
  onSwap: (index: number) => void
  onThumbsUp: (index: number) => void
  onThumbsDown: (index: number) => void
}

export interface MealRowProps {
  row: DayRowData
  meal: MealPlanMeal
  index: number
  thumb: Thumb
  isSwapping: boolean
  actions: MealRowActions
}

export function MealRow({
  row,
  meal,
  index,
  thumb,
  isSwapping,
  actions,
}: MealRowProps) {
  return (
    <li
      data-slot="meal-row"
      data-testid="day-row"
      aria-label={`Meal ${index + 1}: ${meal.title}`}
      className="flex flex-col gap-4 py-5 md:flex-row md:items-start md:gap-6"
    >
      <DayLabel
        dayKey={row.dayKey}
        dateLabel={row.dateLabel}
        theme={row.theme}
      />

      <div className="flex-1 flex flex-col gap-2">
        <h2 className="text-h2 text-ink">{meal.title}</h2>
        {row.kidNote && <KidNote note={row.kidNote} />}
      </div>

      <div className="flex items-center gap-1 md:w-[320px] md:flex-none md:justify-end">
        <Button
          variant={thumb === "up" ? "primary" : "ghost"}
          size="icon"
          aria-label="Thumbs up"
          aria-pressed={thumb === "up"}
          onClick={() => actions.onThumbsUp(index)}
        >
          <ThumbsUp />
        </Button>
        <Button
          variant={thumb === "down" ? "primary" : "ghost"}
          size="icon"
          aria-label="Thumbs down"
          aria-pressed={thumb === "down"}
          onClick={() => actions.onThumbsDown(index)}
          className={cn(
            thumb === "down" &&
              "bg-rose-ink hover:bg-rose-ink/90 active:bg-rose-ink/90",
          )}
        >
          <ThumbsDown />
        </Button>
        <div className="ml-auto md:ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.onSwap(index)}
            disabled={isSwapping}
            aria-label={`Swap meal ${index + 1}`}
          >
            <RefreshCw className={isSwapping ? "animate-spin" : undefined} />
            {isSwapping ? "Swapping…" : "Swap meal"}
          </Button>
        </div>
      </div>
    </li>
  )
}
