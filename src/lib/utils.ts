import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Custom Editorial type tokens (see globals.css @theme inline). Listed
      // here so tailwind-merge knows these are font-size utilities and won't
      // strip a sibling color utility like `text-rose-ink` as a conflict.
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-body",
        "text-body-sm",
        "text-caption",
        "text-eyebrow",
        "text-mono-sm",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
