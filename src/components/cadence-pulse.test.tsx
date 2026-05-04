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
  describe("kind: 'days'", () => {
    it("n=3 fills the rightmost 3 pips forest, leftmost 11 paper-edge", () => {
      const { container } = render(<CadencePulse state={{ kind: "days", n: 3 }} />);
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

    it("n=0 fills no pips (no time elapsed)", () => {
      const { container } = render(<CadencePulse state={{ kind: "days", n: 0 }} />);
      const counts = pipFillCounts(container);
      expect(counts.total).toBe(14);
      expect(counts.forest).toBe(0);
      expect(counts.edge).toBe(14);
    });

    it("n=14 fills all 14 pips forest", () => {
      const { container } = render(<CadencePulse state={{ kind: "days", n: 14 }} />);
      const counts = pipFillCounts(container);
      expect(counts.forest).toBe(14);
      expect(counts.edge).toBe(0);
    });

    it("n=20 clamps the visual to all-forest but keeps the caption literal", () => {
      const { container } = render(<CadencePulse state={{ kind: "days", n: 20 }} />);
      const counts = pipFillCounts(container);
      expect(counts.forest).toBe(14);
      expect(screen.getByText(/20d ago/)).toBeInTheDocument();
    });

    it("renders the trailing caption with mono-sm typography", () => {
      render(<CadencePulse state={{ kind: "days", n: 3 }} />);
      const caption = screen.getByText("3d ago");
      expect(caption).toHaveClass("text-mono-sm", "text-ink-3");
    });
  });

  describe("kind: 'never'", () => {
    it("renders 14 paper-edge pips and a 'never' caption", () => {
      const { container } = render(<CadencePulse state={{ kind: "never" }} />);
      const counts = pipFillCounts(container);
      expect(counts.total).toBe(14);
      expect(counts.forest).toBe(0);
      expect(counts.edge).toBe(14);
      expect(screen.getByText("never")).toBeInTheDocument();
    });

    it("renders the 'never' caption with mono-sm typography", () => {
      render(<CadencePulse state={{ kind: "never" }} />);
      const caption = screen.getByText("never");
      expect(caption).toHaveClass("text-mono-sm", "text-ink-3");
    });
  });

  describe("kind: 'unknown'", () => {
    it("renders an aria-hidden invisible placeholder with no pips exposed", () => {
      const { container } = render(<CadencePulse state={{ kind: "unknown" }} />);
      expect(container.querySelectorAll('[data-slot="pip"]').length).toBe(0);
      expect(screen.queryByText(/d ago/)).not.toBeInTheDocument();
      expect(screen.queryByText("never")).not.toBeInTheDocument();
      const placeholder = container.firstElementChild as HTMLElement;
      expect(placeholder).toHaveAttribute("aria-hidden", "true");
      expect(placeholder.className).toContain("invisible");
    });
  });
});
