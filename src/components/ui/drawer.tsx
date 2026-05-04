"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Drawer({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-ink/20 duration-medium ease-editorial",
        "data-[open]:animate-in data-[open]:fade-in-0",
        "data-[closed]:animate-out data-[closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

interface DrawerContentProps extends DialogPrimitive.Popup.Props {
  width?: number | string
  showCloseButton?: boolean
}

function DrawerContent({
  className,
  children,
  width = 420,
  showCloseButton = true,
  style,
  ...props
}: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DrawerBackdrop />
      <DialogPrimitive.Popup
        data-slot="drawer-content"
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          ...style,
        }}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full flex-col",
          "bg-paper border-l border-paper-edge",
          "duration-medium ease-editorial",
          "data-[open]:animate-in data-[open]:slide-in-from-right",
          "data-[closed]:animate-out data-[closed]:slide-out-to-right",
          "outline-none",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="drawer-close"
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="absolute top-3 right-3"
              />
            }
          >
            <XIcon />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DrawerHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-2 px-6 pt-6 pb-4 bg-paper border-b border-paper-edge",
        className,
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-h3 text-ink", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-body-sm text-ink-3", className)}
      {...props}
    />
  )
}

function DrawerBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  )
}

function DrawerFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4",
        "bg-paper-2 border-t border-paper-edge",
        className,
      )}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
}
