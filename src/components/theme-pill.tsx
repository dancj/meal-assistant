import { Fish, UtensilsCrossed } from "lucide-react"

import { Pill } from "@/components/ui/pill"
import type { ThemeTag } from "@/lib/week-ui"

const ICONS: Record<ThemeTag, typeof Fish> = {
  "taco-tuesday": UtensilsCrossed,
  "fish-friday": Fish,
}

export interface ThemePillProps {
  theme: { tag: ThemeTag; label: string }
}

export function ThemePill({ theme }: ThemePillProps) {
  const Icon = ICONS[theme.tag]
  return (
    <Pill variant="forest" size="sm">
      <Icon aria-hidden="true" />
      <span>{theme.label}</span>
    </Pill>
  )
}
