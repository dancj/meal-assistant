import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const pillVariants = cva(
  "group/pill inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-pill whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        forest: "bg-forest-soft text-forest-2",
        slate: "bg-slate-soft text-slate-ink",
        amber: "bg-amber-soft text-amber-ink",
        rose: "bg-rose-soft text-rose-ink",
      },
      size: {
        sm: "h-5 px-2 text-eyebrow font-mono",
        md: "h-6 px-2.5 text-body-sm",
      },
    },
    defaultVariants: {
      variant: "forest",
      size: "md",
    },
  },
)

function Pill({
  className,
  variant,
  size,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(pillVariants({ variant, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "pill",
      variant,
      size,
    },
  })
}

export { Pill, pillVariants }
