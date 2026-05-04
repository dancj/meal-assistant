// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button — Editorial variants and sizes", () => {
  it("default props render as variant=primary, size=md", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn).toHaveClass("bg-forest", "text-paper", "h-9", "text-body");
  });

  it("variant=primary uses forest with hover/active forest-2", () => {
    render(<Button variant="primary">Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass(
      "bg-forest",
      "text-paper",
      "hover:bg-forest-2",
      "active:bg-forest-2",
    );
  });

  it("variant=default uses paper with paper-edge border + active paper-edge", () => {
    render(<Button variant="default">Cancel</Button>);
    const btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn).toHaveClass(
      "bg-paper",
      "text-ink",
      "border",
      "border-paper-edge",
      "hover:bg-paper-2",
      "active:bg-paper-edge",
    );
  });

  it("variant=ghost is transparent with NO border element + active paper-edge", () => {
    render(<Button variant="ghost">Regenerate</Button>);
    const btn = screen.getByRole("button", { name: "Regenerate" });
    expect(btn).toHaveClass(
      "bg-transparent",
      "text-ink",
      "hover:bg-paper-2",
      "active:bg-paper-edge",
    );
    // Ghost must not paint a 1px border element (causes layout drift in
    // mixed-variant rows like Regenerate (ghost) + Email (primary)).
    expect(btn.className).not.toMatch(/\bborder\b/);
  });

  it("size=sm uses h-7 and text-caption (12.5px)", () => {
    render(<Button size="sm">x</Button>);
    const btn = screen.getByRole("button", { name: "x" });
    expect(btn).toHaveClass("h-7", "text-caption");
  });

  it("size=md uses h-9 and text-body (default)", () => {
    render(<Button size="md">x</Button>);
    const btn = screen.getByRole("button", { name: "x" });
    expect(btn).toHaveClass("h-9", "text-body");
  });

  it("size=icon is a 28x28 square that bumps to 32x32 hit area on coarse pointer", () => {
    render(
      <Button size="icon" aria-label="Close">
        ×
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveClass("size-7", "rounded-pill", "p-0");
    // Coarse-pointer (touch) hit-target widening:
    expect(btn.className).toContain("(pointer:coarse)]:min-h-8");
    expect(btn.className).toContain("(pointer:coarse)]:min-w-8");
  });

  it("forwards click events", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Hit me</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Hit me" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled is non-interactive (aria-disabled / pointer-events-none)", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Off
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Off" });
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(btn).toHaveClass("disabled:pointer-events-none");
  });

  it("uses fast-duration motion timing", () => {
    render(<Button>x</Button>);
    const btn = screen.getByRole("button", { name: "x" });
    expect(btn).toHaveClass("duration-fast");
  });

  it("passes className through (merged after defaults)", () => {
    render(<Button className="ml-4">x</Button>);
    const btn = screen.getByRole("button", { name: "x" });
    expect(btn).toHaveClass("ml-4");
  });
});
