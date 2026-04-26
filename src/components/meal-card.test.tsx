// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealCard } from "./meal-card";
import type { MealPlanMeal } from "@/lib/plan/types";

function meal(overrides: Partial<MealPlanMeal> = {}): MealPlanMeal {
  return {
    title: "Sheet-pan chicken thighs",
    kidVersion: null,
    dealMatches: [],
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof MealCard>> = {}) {
  const onSwap = vi.fn();
  const onThumbsUp = vi.fn();
  const onThumbsDown = vi.fn();
  render(
    <MealCard
      meal={meal()}
      index={0}
      isSwapping={false}
      thumb={null}
      onSwap={onSwap}
      onThumbsUp={onThumbsUp}
      onThumbsDown={onThumbsDown}
      {...props}
    />,
  );
  return { onSwap, onThumbsUp, onThumbsDown };
}

describe("MealCard", () => {
  it("renders title, kid version, and a deal badge per dealMatches entry", () => {
    renderCard({
      meal: meal({
        title: "Tacos",
        kidVersion: "plain chicken, no seasoning",
        dealMatches: [
          { item: "chicken thighs", salePrice: "$1.99/lb", store: "safeway" },
          { item: "tortillas", salePrice: "$2.49", store: "aldi" },
        ],
      }),
    });

    expect(screen.getByText("Tacos")).toBeInTheDocument();
    expect(screen.getByText(/plain chicken, no seasoning/)).toBeInTheDocument();
    expect(
      screen.getByText(/chicken thighs.*\$1\.99\/lb.*safeway/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tortillas.*\$2\.49.*aldi/),
    ).toBeInTheDocument();
  });

  it("does not render kid callout when kidVersion is null", () => {
    renderCard({ meal: meal({ kidVersion: null }) });
    expect(screen.queryByTestId("kid-callout")).toBeNull();
  });

  it("does not render deal badges row when dealMatches is empty", () => {
    renderCard({ meal: meal({ dealMatches: [] }) });
    expect(screen.queryByTestId("deal-badges")).toBeNull();
  });

  it("calls onSwap with the right index on swap click", () => {
    const { onSwap } = renderCard({ index: 3 });
    fireEvent.click(screen.getByRole("button", { name: /swap meal 4/i }));
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onSwap).toHaveBeenCalledWith(3);
  });

  it("calls onThumbsUp / onThumbsDown with the index", () => {
    const { onThumbsUp, onThumbsDown } = renderCard({ index: 2 });
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    fireEvent.click(screen.getByRole("button", { name: /thumbs down/i }));
    expect(onThumbsUp).toHaveBeenCalledWith(2);
    expect(onThumbsDown).toHaveBeenCalledWith(2);
  });

  it("disables swap and ignores extra clicks when isSwapping is true", () => {
    const { onSwap } = renderCard({ index: 0, isSwapping: true });
    const swap = screen.getByRole("button", { name: /swap meal 1/i });
    expect(swap).toBeDisabled();
    fireEvent.click(swap);
    expect(onSwap).not.toHaveBeenCalled();
  });

  it("reflects thumb='up' with aria-pressed=true on the up button", () => {
    renderCard({ thumb: "up" });
    expect(screen.getByRole("button", { name: /thumbs up/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /thumbs down/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects thumb='down' with aria-pressed=true on the down button", () => {
    renderCard({ thumb: "down" });
    expect(
      screen.getByRole("button", { name: /thumbs down/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
