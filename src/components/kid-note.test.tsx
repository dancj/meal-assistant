// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KidNote } from "./kid-note";

describe("KidNote", () => {
  it("renders amber tile with name pill + free text when `who` is provided", () => {
    render(<KidNote note={{ who: "Iris", text: "use cheese instead" }} />);
    expect(screen.getByText("Iris")).toBeInTheDocument();
    expect(screen.getByText("use cheese instead")).toBeInTheDocument();
  });

  it("renders amber tile with text-only when `who` is null (Phase 2 default)", () => {
    const { container } = render(
      <KidNote note={{ who: null, text: "use cheese instead" }} />,
    );
    expect(screen.getByText("use cheese instead")).toBeInTheDocument();
    // No Pill rendered for the name
    expect(container.querySelectorAll('[data-slot="pill"]').length).toBe(0);
  });

  it("uses amber-soft / amber-ink tokens on the tile", () => {
    const { container } = render(
      <KidNote note={{ who: null, text: "x" }} />,
    );
    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveClass("bg-amber-soft", "text-amber-ink");
  });
});
