// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";

describe("Drawer", () => {
  it("renders the popup when open=true with right-0 + 420px default width", () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Choose a swap</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const popup = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
    expect(popup).toBeTruthy();
    expect(popup).toHaveClass("fixed", "inset-y-0", "right-0", "bg-paper", "border-l", "border-paper-edge");
    expect(popup.style.width).toBe("420px");
  });

  it("accepts a custom width prop", () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent width={520}>
          <DrawerTitle>Wide drawer</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const popup = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
    expect(popup.style.width).toBe("520px");
  });

  it("includes duration-medium + ease-editorial + starting/ending translate motion classes", () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>x</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const popup = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
    expect(popup.className).toContain("duration-medium");
    expect(popup.className).toContain("ease-editorial");
    expect(popup.className).toContain("transition-transform");
    expect(popup.className).toContain("data-[starting-style]:translate-x-full");
    expect(popup.className).toContain("data-[ending-style]:translate-x-full");
  });

  it("DrawerHeader's close-icon button carries aria-label='Close'", () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Hi</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("DrawerBody is flex-1 with overflow-y-auto", () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerBody data-testid="body">content</DrawerBody>
        </DrawerContent>
      </Drawer>,
    );
    const body = screen.getByTestId("body");
    expect(body).toHaveClass("flex-1", "overflow-y-auto");
  });

  it("DrawerFooter is sticky paper-2 with paper-edge top border", () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerFooter data-testid="footer">x</DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveClass("sticky", "bottom-0", "bg-paper-2", "border-t", "border-paper-edge");
  });

  it("clicking the built-in close button calls onOpenChange(false)", () => {
    const handle = vi.fn();
    render(
      <Drawer open onOpenChange={handle}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Hi</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(handle).toHaveBeenCalled();
    expect(handle.mock.calls[0]?.[0]).toBe(false);
  });

  it("Esc key while open calls onOpenChange(false)", () => {
    const handle = vi.fn();
    render(
      <Drawer open onOpenChange={handle}>
        <DrawerContent>
          <DrawerTitle>Hi</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape", code: "Escape" });
    expect(handle).toHaveBeenCalled();
    expect(handle.mock.calls[0]?.[0]).toBe(false);
  });
});
