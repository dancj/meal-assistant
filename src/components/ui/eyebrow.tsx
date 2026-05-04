import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

function Eyebrow({
  className,
  render,
  ...props
}: useRender.ComponentProps<"span">) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          "font-mono text-eyebrow uppercase text-ink-3",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "eyebrow" },
  })
}

export { Eyebrow }
