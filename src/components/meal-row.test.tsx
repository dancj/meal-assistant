// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MealRow, type MealRowActions } from "./meal-row";
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

const noopActions: MealRowActions = {
  onSwap: () => {},
  onThumbsUp: () => {},
  onThumbsDown: () => {},
};

describe("MealRow", () => {
  it("renders meal title in an h2 with text-h2 styling", () => {
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb={null}
        isSwapping={false}
        actions={noopActions}
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
        actions={noopActions}
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
        actions={noopActions}
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
        actions={noopActions}
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
        actions={noopActions}
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
        actions={noopActions}
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
        actions={noopActions}
      />,
    );
    const down = screen.getByRole("button", { name: "Thumbs down" });
    expect(down).toHaveAttribute("aria-pressed", "true");
    expect(down).toHaveClass("bg-rose-ink");
  });

  it("clicking the thumbs-up button calls actions.onThumbsUp(index)", () => {
    const actions: MealRowActions = {
      ...noopActions,
      onThumbsUp: vi.fn(),
    };
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={3}
        thumb={null}
        isSwapping={false}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Thumbs up" }));
    expect(actions.onThumbsUp).toHaveBeenCalledWith(3);
  });

  it("clicking the thumbs-down button calls actions.onThumbsDown(index)", () => {
    const actions: MealRowActions = {
      ...noopActions,
      onThumbsDown: vi.fn(),
    };
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={3}
        thumb={null}
        isSwapping={false}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Thumbs down" }));
    expect(actions.onThumbsDown).toHaveBeenCalledWith(3);
  });

  it("clicking Swap calls actions.onSwap(index)", () => {
    const actions: MealRowActions = { ...noopActions, onSwap: vi.fn() };
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={2}
        thumb={null}
        isSwapping={false}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Swap meal 3" }));
    expect(actions.onSwap).toHaveBeenCalledWith(2);
  });

  it("isSwapping disables Swap and shows 'Swapping…' label", () => {
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb={null}
        isSwapping={true}
        actions={noopActions}
      />,
    );
    const swap = screen.getByRole("button", { name: "Swap meal 1" });
    expect(swap).toBeDisabled();
    expect(swap).toHaveTextContent(/swapping/i);
  });

  it("clicking a disabled Swap button does not fire actions.onSwap", () => {
    const actions: MealRowActions = { ...noopActions, onSwap: vi.fn() };
    render(
      <MealRow
        row={baseRow}
        meal={baseMeal}
        index={0}
        thumb={null}
        isSwapping={true}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Swap meal 1" }));
    expect(actions.onSwap).not.toHaveBeenCalled();
  });
});
