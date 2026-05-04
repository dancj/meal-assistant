// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DayLabel } from "./day-label";

describe("DayLabel", () => {
  it("renders day abbrev + date with mono-sm typography", () => {
    render(<DayLabel dayKey="MON" dateLabel="Apr 27" theme={null} />);
    const dayKey = screen.getByText("MON");
    const date = screen.getByText("Apr 27");
    expect(dayKey).toHaveClass("text-mono-sm");
    expect(date).toHaveClass("text-mono-sm", "text-ink-3");
  });

  it("hides ThemePill when theme is null", () => {
    const { container } = render(
      <DayLabel dayKey="WED" dateLabel="Apr 29" theme={null} />,
    );
    expect(container.querySelector('[data-slot="pill"]')).toBeNull();
  });

  it("renders ThemePill below the date when theme is present", () => {
    render(
      <DayLabel
        dayKey="TUE"
        dateLabel="Apr 28"
        theme={{ tag: "taco-tuesday", label: "Taco Tuesday" }}
      />,
    );
    expect(screen.getByText("Taco Tuesday")).toBeInTheDocument();
  });

  it("applies fixed 120px width", () => {
    const { container } = render(
      <DayLabel dayKey="MON" dateLabel="Apr 27" theme={null} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("w-[120px]");
  });
});
