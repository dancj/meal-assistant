"use client"

import { Sparkles } from "lucide-react"

import { SwapSuggestion } from "@/components/swap-suggestion"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Eyebrow } from "@/components/ui/eyebrow"
import { HairlineList } from "@/components/ui/hairline-list"
import type { Recipe } from "@/lib/recipes/types"
import type { RankedSuggestion } from "@/lib/swap-ui"
import type { DayKey } from "@/lib/week-ui"

export interface SwapDrawerSlot {
  index: number
  dayKey: DayKey
  dateLabel: string
  currentTitle: string
  suggestions: RankedSuggestion[]
}

export interface SwapDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: SwapDrawerSlot | null
  onSelect: (index: number, recipe: Recipe) => void
}

export function SwapDrawer({ open, onOpenChange, slot, onSelect }: SwapDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width={420}>
        {slot && (
          <>
            <DrawerHeader>
              <Eyebrow>
                {slot.dayKey} · {slot.dateLabel}
              </Eyebrow>
              <DrawerTitle>Choose a swap</DrawerTitle>
              <DrawerDescription>
                Replacing: <span className="text-ink">{slot.currentTitle}</span>
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody>
              <span data-slot="swap-drawer-rules-eyebrow">
                <Eyebrow className="inline-flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Fits your rules
                </Eyebrow>
              </span>
              {slot.suggestions.length === 0 ? (
                <p className="text-body-sm text-ink-3 mt-3">
                  No swaps available — your week already uses every recipe.
                </p>
              ) : (
                <HairlineList as="ul" className="mt-3">
                  {slot.suggestions.map((s) => (
                    <li key={s.recipe.filename}>
                      <SwapSuggestion
                        suggestion={s}
                        onSelect={(recipe) => onSelect(slot.index, recipe)}
                      />
                    </li>
                  ))}
                </HairlineList>
              )}
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
