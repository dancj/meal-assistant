// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Recipe } from "@/lib/recipes/types";
import type { RankedSuggestion } from "@/lib/swap-ui";

import { SwapDrawer, type SwapDrawerSlot } from "./swap-drawer";

const recipe = (title: string): Recipe => ({
  title,
  tags: ["dinner"],
  kidVersion: null,
  content: "",
  filename: `${title}.md`,
});

const suggestion = (
  title: string,
  overrides: Partial<RankedSuggestion> = {},
): RankedSuggestion => ({
  recipe: recipe(title),
  protein: "fish",
  daysAgo: 5,
  score: 10,
  ...overrides,
});

const slot = (overrides: Partial<SwapDrawerSlot> = {}): SwapDrawerSlot => ({
  index: 1,
  dayKey: "TUE",
  dateLabel: "Apr 28",
  currentTitle: "Sausage skillet",
  suggestions: [
    suggestion("Pan-seared salmon"),
    suggestion("Honey chicken"),
    suggestion("Tofu bowl"),
  ],
  ...overrides,
});

describe("SwapDrawer", () => {
  it("renders the dialog with eyebrow, title, and replacing caption", async () => {
    render(
      <SwapDrawer
        open
        onOpenChange={() => {}}
        slot={slot()}
        onSelect={() => {}}
      />,
    );
    expect(
      await screen.findByRole("dialog", { name: "Choose a swap" }),
    ).toBeInTheDocument();
    expect(screen.getByText("TUE · Apr 28")).toBeInTheDocument();
    expect(screen.getByText(/Sausage skillet/)).toBeInTheDocument();
  });

  it("renders the 'Fits your rules' eyebrow with a Sparkles SVG", async () => {
    render(
      <SwapDrawer
        open
        onOpenChange={() => {}}
        slot={slot()}
        onSelect={() => {}}
      />,
    );
    await screen.findByRole("dialog");
    expect(screen.getByText(/Fits your rules/)).toBeInTheDocument();
    // Sparkles icon renders as an SVG inside the eyebrow wrapper. The drawer
    // portals out of the test container so we query the document.
    const sparkles = document.querySelector(
      "[data-slot='swap-drawer-rules-eyebrow'] svg",
    );
    expect(sparkles).not.toBeNull();
  });

  it("renders one SwapSuggestion per suggestion", async () => {
    render(
      <SwapDrawer
        open
        onOpenChange={() => {}}
        slot={slot()}
        onSelect={() => {}}
      />,
    );
    await screen.findByRole("dialog");
    const buttons = screen.getAllByTestId("swap-suggestion");
    expect(buttons).toHaveLength(3);
  });

  it("calls onSelect with the slot index and chosen recipe when a suggestion is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SwapDrawer
        open
        onOpenChange={() => {}}
        slot={slot()}
        onSelect={onSelect}
      />,
    );
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Swap to Pan-seared salmon" }));
    expect(onSelect).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: "Pan-seared salmon" }),
    );
  });

  it("calls onOpenChange(false) when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SwapDrawer
        open
        onOpenChange={onOpenChange}
        slot={slot()}
        onSelect={() => {}}
      />,
    );
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });

  it("renders the empty-state copy when suggestions is empty", async () => {
    render(
      <SwapDrawer
        open
        onOpenChange={() => {}}
        slot={slot({ suggestions: [] })}
        onSelect={() => {}}
      />,
    );
    await screen.findByRole("dialog");
    expect(
      screen.getByText(/No swaps available — your week already uses every recipe\./),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("swap-suggestion")).toHaveLength(0);
  });

  it("renders nothing when open is false", () => {
    render(
      <SwapDrawer
        open={false}
        onOpenChange={() => {}}
        slot={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes the dialog from the DOM after onOpenChange transitions to false", async () => {
    const { rerender } = render(
      <SwapDrawer
        open
        onOpenChange={() => {}}
        slot={slot()}
        onSelect={() => {}}
      />,
    );
    await screen.findByRole("dialog");
    rerender(
      <SwapDrawer
        open={false}
        onOpenChange={() => {}}
        slot={null}
        onSelect={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
