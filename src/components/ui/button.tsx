"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-pill whitespace-nowrap font-medium select-none",
    "transition-colors duration-fast ease-editorial",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-forest text-paper hover:bg-forest-2 active:bg-forest-2",
        default:
          "bg-paper text-ink border border-paper-edge hover:bg-paper-2 active:bg-paper-edge",
        ghost:
          "bg-transparent text-ink hover:bg-paper-2 active:bg-paper-edge",
      },
      size: {
        sm: "h-7 px-2.5 text-caption gap-1.5",
        md: "h-9 px-3.5 text-body",
        icon: "size-7 rounded-pill p-0 [&_svg:not([class*='size-'])]:size-4 [@media(pointer:coarse)]:min-h-8 [@media(pointer:coarse)]:min-w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
