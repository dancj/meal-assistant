import * as React from "react"

import { cn } from "@/lib/utils"

type HairlineListAs = "div" | "ul" | "ol"

type HairlineListProps<T extends HairlineListAs = "div"> = {
  as?: T
  className?: string
  children?: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">

function HairlineList<T extends HairlineListAs = "div">({
  as,
  className,
  children,
  ...props
}: HairlineListProps<T>) {
  const Tag = (as ?? "div") as HairlineListAs
  return React.createElement(
    Tag,
    {
      "data-slot": "hairline-list",
      className: cn(
        "[&>*+*]:border-t [&>*+*]:border-paper-edge",
        className,
      ),
      ...props,
    },
    children,
  )
}

export { HairlineList }
