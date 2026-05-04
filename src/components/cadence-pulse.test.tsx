// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CadencePulse } from "./cadence-pulse";

function pipFillCounts(container: HTMLElement) {
  const pips = container.querySelectorAll('[data-slot="pip"]');
  let forest = 0;
  let edge = 0;
  pips.forEach((pip) => {
    const cls = pip.className;
    if (cls.includes("bg-forest")) forest++;
    else if (cls.includes("bg-paper-edge")) edge++;
  });
  return { total: pips.length, forest, edge };
}

describe("CadencePulse", () => {
  it("daysAgo=3 fills the rightmost 3 pips forest, leftmost 11 paper-edge", () => {
    const { container } = render(<CadencePulse daysAgo={3} />);
    const counts = pipFillCounts(container);
    expect(counts.total).toBe(14);
    expect(counts.forest).toBe(3);
    expect(counts.edge).toBe(11);

    // Verify the *rightmost* 3 are filled (not leftmost) by inspecting position
    const pips = container.querySelectorAll('[data-slot="pip"]');
    expect(pips[0].className).toContain("bg-paper-edge");
    expect(pips[10].className).toContain("bg-paper-edge");
    expect(pips[11].className).toContain("bg-forest");
    expect(pips[13].className).toContain("bg-forest");
  });

  it("daysAgo=0 fills no pips (no time elapsed)", () => {
    const { container } = render(<CadencePulse daysAgo={0} />);
    const counts = pipFillCounts(container);
    expect(counts.total).toBe(14);
    expect(counts.forest).toBe(0);
    expect(counts.edge).toBe(14);
  });

  it("daysAgo=14 fills all 14 pips forest", () => {
    const { container } = render(<CadencePulse daysAgo={14} />);
    const counts = pipFillCounts(container);
    expect(counts.forest).toBe(14);
    expect(counts.edge).toBe(0);
  });

  it("daysAgo=20 clamps the visual to all-forest but keeps the caption literal", () => {
    const { container } = render(<CadencePulse daysAgo={20} />);
    const counts = pipFillCounts(container);
    expect(counts.forest).toBe(14);
    expect(screen.getByText(/20d ago/)).toBeInTheDocument();
  });

  it("renders the trailing caption with mono-sm typography", () => {
    render(<CadencePulse daysAgo={3} />);
    const caption = screen.getByText("3d ago");
    expect(caption).toHaveClass("text-mono-sm", "text-ink-3");
  });

  it("daysAgo=null renders an aria-hidden invisible placeholder with no pips exposed", () => {
    const { container } = render(<CadencePulse daysAgo={null} />);
    expect(container.querySelectorAll('[data-slot="pip"]').length).toBe(0);
    expect(screen.queryByText(/d ago/)).not.toBeInTheDocument();
    const placeholder = container.firstElementChild as HTMLElement;
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(placeholder.className).toContain("invisible");
  });
});
