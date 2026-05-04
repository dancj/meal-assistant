import { ThemePill } from "@/components/theme-pill"
import type { DayKey, ThemeTag } from "@/lib/week-ui"

export interface DayLabelProps {
  dayKey: DayKey
  dateLabel: string
  theme: { tag: ThemeTag; label: string } | null
}

export function DayLabel({ dayKey, dateLabel, theme }: DayLabelProps) {
  return (
    <div className="flex flex-col gap-1 w-[120px] flex-none">
      <span className="text-mono-sm text-ink-2">{dayKey}</span>
      <span className="text-mono-sm text-ink-3">{dateLabel}</span>
      {theme && (
        <div className="mt-1">
          <ThemePill theme={theme} />
        </div>
      )}
    </div>
  )
}
