// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MealRow } from "./meal-row";
import type { DayRowData } from "@/lib/week-ui";

const baseRow: DayRowData = {
  dayKey: "MON",
  dateLabel: "Apr 27",
  theme: null,
  kidNote: null,
  metadata: { protein: null, prepMinutes: null, daysAgo: null },
};

const baseMeal = {
  title: "Salmon with rice",
  kidVersion: null,
  dealMatches: [],
};

const noop = () => {};

describe("MealRow", () => {
  it("renders meal title in an h2 with text-h2 styling", () => {
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb={null}
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Salmon with rice");
    expect(heading).toHaveClass("text-h2");
  });

  it("the outer <li> carries aria-label='Meal N: title' for the page-level selector", () => {
    const { container } = render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={2}
        thumb={null}
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    const li = container.querySelector("li") as HTMLElement;
    expect(li.getAttribute("aria-label")).toBe("Meal 3: Salmon with rice");
  });

  it("renders the DayLabel column with the day abbrev", () => {
    render(
      <MealRow
        row={{ ...baseRow, dayKey: "FRI", dateLabel: "May 01" }}
        meal={baseMeal}
        index={4}
        thumb={null}
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    expect(screen.getByText("FRI")).toBeInTheDocument();
    expect(screen.getByText("May 01")).toBeInTheDocument();
  });

  it("renders KidNote when row.kidNote is provided", () => {
    render(
      <MealRow
        row={{ ...baseRow, kidNote: { who: null, text: "use cheese" } }}
        meal={baseMeal}
        index={0}
        thumb={null}
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    expect(screen.getByText("use cheese")).toBeInTheDocument();
  });

  it("renders ThemePill via DayLabel when row.theme is set", () => {
    render(
      <MealRow
        row={{
          ...baseRow,
          dayKey: "TUE",
          theme: { tag: "taco-tuesday", label: "Taco Tuesday" },
        }}
        meal={baseMeal}
        index={1}
        thumb={null}
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    expect(screen.getByText("Taco Tuesday")).toBeInTheDocument();
  });

  it("thumb-up button is primary variant + aria-pressed=true when thumb=up", () => {
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb="up"
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    const up = screen.getByRole("button", { name: "Thumbs up" });
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(up).toHaveClass("bg-forest");
  });

  it("thumb-down button uses rose-ink override when thumb=down", () => {
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb="down"
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    const down = screen.getByRole("button", { name: "Thumbs down" });
    expect(down).toHaveAttribute("aria-pressed", "true");
    expect(down).toHaveClass("bg-rose-ink");
  });

  it("clicking the thumbs-up button calls onThumbsUp(index)", () => {
    const onThumbsUp = vi.fn();
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={3}
        thumb={null}
        isSwapping={false}
        onSwap={noop}
        onThumbsUp={onThumbsUp}
        onThumbsDown={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Thumbs up" }));
    expect(onThumbsUp).toHaveBeenCalledWith(3);
  });

  it("clicking Swap calls onSwap(index)", () => {
    const onSwap = vi.fn();
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={2}
        thumb={null}
        isSwapping={false}
        onSwap={onSwap}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Swap meal 3" }));
    expect(onSwap).toHaveBeenCalledWith(2);
  });

  it("isSwapping disables Swap and shows 'Swapping…' label", () => {
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb={null}
        isSwapping={true}
        onSwap={noop}
        onThumbsUp={noop}
        onThumbsDown={noop}
      />,
    );
    const swap = screen.getByRole("button", { name: "Swap meal 1" });
    expect(swap).toBeDisabled();
    expect(swap).toHaveTextContent(/swapping/i);
  });
});
