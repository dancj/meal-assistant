// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroceryList } from "./grocery-list";
import type { GroceryItem } from "@/lib/plan/types";

function item(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    item: "chicken thighs",
    quantity: "2 lb",
    store: "aldi",
    dealMatch: null,
    ...overrides,
  };
}

describe("GroceryList", () => {
  it("renders sections in canonical store order: aldi, safeway, costco, wegmans", () => {
    const items: GroceryItem[] = [
      item({ store: "wegmans", item: "Z item" }),
      item({ store: "costco", item: "Y item" }),
      item({ store: "safeway", item: "X item" }),
      item({ store: "aldi", item: "W item" }),
    ];
    render(<GroceryList items={items} />);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["Aldi", "Safeway", "Costco", "Wegmans"]);
  });

  it("renders deal badge only for items with a dealMatch", () => {
    render(
      <GroceryList
        items={[
          item({
            item: "tortillas",
            store: "aldi",
            dealMatch: { salePrice: "$2.49", validTo: "2026-05-01" },
          }),
          item({ item: "broccoli", store: "aldi", dealMatch: null }),
        ]}
      />,
    );

    const tortillas = screen.getByText("tortillas").closest("li");
    const broccoli = screen.getByText("broccoli").closest("li");
    if (!tortillas || !broccoli) throw new Error("missing rows");

    expect(within(tortillas).getByText(/\$2\.49/)).toBeInTheDocument();
    expect(within(broccoli).queryByText(/\$/)).toBeNull();
  });

  it("omits empty stores entirely", () => {
    render(<GroceryList items={[item({ store: "costco" })]} />);
    expect(screen.getByRole("heading", { name: "Costco" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aldi" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Safeway" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Wegmans" })).toBeNull();
  });

  it("renders empty-state line when items is empty", () => {
    render(<GroceryList items={[]} />);
    expect(screen.getByText(/no grocery items/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("renders items in array order within a store", () => {
    render(
      <GroceryList
        items={[
          item({ store: "aldi", item: "first" }),
          item({ store: "aldi", item: "second" }),
          item({ store: "aldi", item: "third" }),
        ]}
      />,
    );
    const aldiHeading = screen.getByRole("heading", { name: "Aldi" });
    const section = aldiHeading.parentElement;
    if (!section) throw new Error("missing section");
    const labels = within(section)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(labels.map((l) => l?.match(/(first|second|third)/)?.[1])).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("renders quantity prefix when present and just the item when quantity is empty", () => {
    render(
      <GroceryList
        items={[
          item({ store: "aldi", item: "milk", quantity: "1 gal" }),
          item({ store: "aldi", item: "salt", quantity: "" }),
        ]}
      />,
    );
    expect(screen.getByText(/1 gal/)).toBeInTheDocument();
    const saltRow = screen.getByText("salt").closest("li");
    if (!saltRow) throw new Error("missing row");
    expect(within(saltRow).queryByText(/·/)).toBeNull();
  });
});
