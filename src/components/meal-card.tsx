"use client";

import { RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { MealPlanMeal } from "@/lib/plan/types";
import type { Thumb } from "@/lib/plan-ui/state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MealCardProps {
  meal: MealPlanMeal;
  index: number;
  isSwapping: boolean;
  thumb: Thumb;
  dayLabel?: string;
  isTonight?: boolean;
  onSwap: (index: number) => void;
  onThumbsUp: (index: number) => void;
  onThumbsDown: (index: number) => void;
}

export function MealCard({
  meal,
  index,
  isSwapping,
  thumb,
  dayLabel,
  isTonight = false,
  onSwap,
  onThumbsUp,
  onThumbsDown,
}: MealCardProps) {
  return (
    <Card
      aria-label={`Meal ${index + 1}: ${meal.title}`}
      className={cn(
        isTonight &&
          "ring-2 ring-primary/60 shadow-md sm:col-span-2 xl:col-span-2",
      )}
    >
      <CardHeader className="gap-1">
        {(dayLabel || isTonight) && (
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isTonight && (
              <span
                data-testid="tonight-marker"
                className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground"
              >
                Tonight
              </span>
            )}
            {dayLabel && <span data-testid="day-label">{dayLabel}</span>}
          </div>
        )}
        <CardTitle className={cn(isTonight ? "text-xl" : "text-lg")}>
          {meal.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {meal.kidVersion !== null && (
          <div
            className="rounded-md border-l-4 border-accent-foreground/40 bg-accent/40 px-3 py-2 text-sm text-accent-foreground"
            data-testid="kid-callout"
          >
            <span aria-hidden="true">🧒 </span>
            <span>{meal.kidVersion}</span>
          </div>
        )}

        <div className="flex items-center gap-1 pt-1">
          <Button
            variant={thumb === "up" ? "default" : "ghost"}
            size="icon-sm"
            aria-label="Thumbs up"
            aria-pressed={thumb === "up"}
            onClick={() => onThumbsUp(index)}
            className={cn(
              thumb === "up" && "bg-success text-success-foreground hover:bg-success/90",
            )}
          >
            <ThumbsUp />
          </Button>
          <Button
            variant={thumb === "down" ? "default" : "ghost"}
            size="icon-sm"
            aria-label="Thumbs down"
            aria-pressed={thumb === "down"}
            onClick={() => onThumbsDown(index)}
            className={cn(
              thumb === "down" && "bg-destructive text-primary-foreground hover:bg-destructive/90",
            )}
          >
            <ThumbsDown />
          </Button>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwap(index)}
              disabled={isSwapping}
              aria-label={`Swap meal ${index + 1}`}
            >
              <RefreshCw className={isSwapping ? "animate-spin" : undefined} />
              {isSwapping ? "Swapping…" : "Swap"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
