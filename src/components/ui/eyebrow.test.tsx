// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Eyebrow } from "./eyebrow";

describe("Eyebrow", () => {
  it("renders a span by default with mono / eyebrow / uppercase / ink-3", () => {
    render(<Eyebrow>Apr 27 — May 03</Eyebrow>);
    const el = screen.getByText("Apr 27 — May 03");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("font-mono", "text-eyebrow", "uppercase", "text-ink-3");
  });

  it("renders polymorphically via the render prop", () => {
    render(<Eyebrow render={<p />}>Issue 17</Eyebrow>);
    const el = screen.getByText("Issue 17");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("font-mono", "text-eyebrow", "uppercase");
  });

  it("merges custom classNames after the defaults (color override wins)", () => {
    render(<Eyebrow className="text-forest-2">Fits your rules</Eyebrow>);
    const el = screen.getByText("Fits your rules");
    // Override should win over default ink-3
    expect(el).toHaveClass("text-forest-2");
    expect(el).not.toHaveClass("text-ink-3");
  });
});
