// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DealsSidebar } from "./deals-sidebar";
import type { Deal } from "@/lib/deals/types";

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    productName: "Chicken Thighs",
    brand: "Brand",
    salePrice: "$1.99/lb",
    regularPrice: "$3.99/lb",
    promoType: "sale",
    validFrom: "2026-04-25",
    validTo: "2026-05-01",
    store: "safeway",
    ...overrides,
  };
}

describe("DealsSidebar", () => {
  it("renders both store sections with the right counts", () => {
    const deals: Deal[] = [
      deal({ store: "safeway", productName: "Safeway A" }),
      deal({ store: "safeway", productName: "Safeway B" }),
      deal({ store: "aldi", productName: "Aldi A" }),
      deal({ store: "aldi", productName: "Aldi B" }),
      deal({ store: "aldi", productName: "Aldi C" }),
    ];

    render(<DealsSidebar deals={deals} />);
    const safeway = screen.getByRole("heading", { name: /safeway/i });
    const aldi = screen.getByRole("heading", { name: /aldi/i });
    expect(safeway).toBeInTheDocument();
    expect(aldi).toBeInTheDocument();

    const safewaySection = safeway.parentElement;
    const aldiSection = aldi.parentElement;
    if (!safewaySection || !aldiSection) throw new Error("missing sections");

    expect(within(safewaySection).getAllByText(/Safeway [AB]/)).toHaveLength(2);
    expect(within(aldiSection).getAllByText(/Aldi [ABC]/)).toHaveLength(3);
  });

  it("renders productName, salePrice, and validTo for each deal", () => {
    render(
      <DealsSidebar
        deals={[
          deal({
            productName: "Ground Beef",
            salePrice: "$4.99/lb",
            validTo: "2026-05-03",
          }),
        ]}
      />,
    );
    expect(screen.getByText("Ground Beef")).toBeInTheDocument();
    expect(screen.getByText("$4.99/lb")).toBeInTheDocument();
    expect(screen.getByText(/Through 2026-05-03/i)).toBeInTheDocument();
  });

  it("renders empty-state line when deals is empty", () => {
    render(<DealsSidebar deals={[]} />);
    expect(screen.getByText(/no deals available/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /safeway/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /aldi/i })).toBeNull();
  });

  it("omits a store's section when it has no deals", () => {
    render(
      <DealsSidebar
        deals={[deal({ store: "aldi", productName: "Aldi only" })]}
      />,
    );
    expect(screen.getByRole("heading", { name: /aldi/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /safeway/i })).toBeNull();
  });

  it("renders a promo badge for non-sale promos and none for sale", () => {
    render(
      <DealsSidebar
        deals={[
          deal({ promoType: "bogo", productName: "Pizza" }),
          deal({ promoType: "sale", productName: "Apples" }),
        ]}
      />,
    );

    const bogoRow = screen.getByText("Pizza").closest("li");
    if (!bogoRow) throw new Error("missing row");
    expect(within(bogoRow).getByText(/BOGO/i)).toBeInTheDocument();

    const saleRow = screen.getByText("Apples").closest("li");
    if (!saleRow) throw new Error("missing row");
    expect(
      within(saleRow).queryByText(/BOGO|% off|\$ off|Multi-buy/i),
    ).toBeNull();
  });
});
