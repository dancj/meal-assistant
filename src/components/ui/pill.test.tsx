// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pill } from "./pill";

describe("Pill", () => {
  it("renders with default forest variant + md size", () => {
    render(<Pill>Taco Tuesday</Pill>);
    const pill = screen.getByText("Taco Tuesday");
    expect(pill).toHaveClass("bg-forest-soft", "text-forest-2");
    // md is default; uses h-6 and body-sm sizing
    expect(pill).toHaveClass("h-6");
  });

  it("applies the slate variant classes", () => {
    render(<Pill variant="slate">Pasta</Pill>);
    const pill = screen.getByText("Pasta");
    expect(pill).toHaveClass("bg-slate-soft", "text-slate-ink");
  });

  it("applies the amber variant classes", () => {
    render(<Pill variant="amber">Iris: dairy free</Pill>);
    const pill = screen.getByText("Iris: dairy free");
    expect(pill).toHaveClass("bg-amber-soft", "text-amber-ink");
  });

  it("applies the rose variant classes", () => {
    render(<Pill variant="rose">Shellfish</Pill>);
    const pill = screen.getByText("Shellfish");
    expect(pill).toHaveClass("bg-rose-soft", "text-rose-ink");
  });

  it("size=sm uses h-5 and the eyebrow text token (mono + tracked)", () => {
    render(<Pill size="sm">3 d ago</Pill>);
    const pill = screen.getByText("3 d ago");
    expect(pill).toHaveClass("h-5", "text-eyebrow", "font-mono");
  });

  it("size=md uses h-6", () => {
    render(<Pill size="md">Default</Pill>);
    const pill = screen.getByText("Default");
    expect(pill).toHaveClass("h-6");
  });

  it("renders polymorphically via the render prop (e.g. as a button)", () => {
    render(
      <Pill render={<button type="button" />} variant="forest">
        Click me
      </Pill>,
    );
    const pill = screen.getByRole("button", { name: "Click me" });
    expect(pill.tagName).toBe("BUTTON");
    expect(pill).toHaveClass("bg-forest-soft");
  });

  it("merges a custom className after the variant classes", () => {
    render(<Pill className="ml-4">x</Pill>);
    const pill = screen.getByText("x");
    expect(pill).toHaveClass("ml-4");
  });

  it("is shaped as a pill (rounded-pill) and uses inline-flex with a gap for icon prefixes", () => {
    render(<Pill>x</Pill>);
    const pill = screen.getByText("x");
    expect(pill).toHaveClass("rounded-pill", "inline-flex", "items-center");
  });
});
