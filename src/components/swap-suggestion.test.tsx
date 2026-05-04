// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Recipe } from "@/lib/recipes/types";
import type { RankedSuggestion } from "@/lib/swap-ui";

import { SwapSuggestion } from "./swap-suggestion";

const recipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  title: "Pan-seared salmon",
  tags: ["dinner", "fish"],
  kidVersion: null,
  content: "",
  filename: "pan-seared-salmon.md",
  ...overrides,
});

const suggestion = (
  overrides: Partial<RankedSuggestion> = {},
): RankedSuggestion => ({
  recipe: recipe(),
  protein: "fish",
  daysAgo: 5,
  score: 15,
  ...overrides,
});

describe("SwapSuggestion", () => {
  it("renders the recipe title as a heading", () => {
    render(<SwapSuggestion suggestion={suggestion()} onSelect={() => {}} />);
    const heading = screen.getByRole("heading", { name: "Pan-seared salmon" });
    expect(heading.tagName).toBe("H4");
    expect(heading).toHaveClass("text-h4", "text-ink");
  });

  it("renders a slate pill with the protein label when protein is non-null", () => {
    render(<SwapSuggestion suggestion={suggestion()} onSelect={() => {}} />);
    const proteinPill = screen.getByText("fish");
    expect(proteinPill.className).toContain("bg-slate-soft");
  });

  it("does not render a protein pill when protein is null", () => {
    render(
      <SwapSuggestion
        suggestion={suggestion({ protein: null })}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByText(/fish|chicken|beef|pork|vegetarian/)).not.toBeInTheDocument();
  });

  it("renders CadencePulse with kind:'days' when daysAgo is non-null", () => {
    render(
      <SwapSuggestion
        suggestion={suggestion({ daysAgo: 5 })}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("5d ago")).toBeInTheDocument();
  });

  it("renders CadencePulse with kind:'never' when daysAgo is null", () => {
    render(
      <SwapSuggestion
        suggestion={suggestion({ daysAgo: null })}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("never")).toBeInTheDocument();
  });

  it("calls onSelect with the recipe when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const s = suggestion();
    render(<SwapSuggestion suggestion={s} onSelect={onSelect} />);
    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(s.recipe);
  });

  it("uses an accessible aria-label of 'Swap to {title}'", () => {
    render(<SwapSuggestion suggestion={suggestion()} onSelect={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Swap to Pan-seared salmon" }),
    ).toBeInTheDocument();
  });

  it("is keyboard-focusable as a real <button>", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SwapSuggestion suggestion={suggestion()} onSelect={onSelect} />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalled();
  });
});
