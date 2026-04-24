import { describe, expect, it } from "vitest";
import { classifyPromo, firstNonEmpty, parseFlippItem } from "./parse";

function baseSafewayItem(overrides: Record<string, unknown> = {}) {
  return {
    merchant: "Safeway",
    name: "Organic Apples",
    brand: "Gala",
    current_price: "2.99",
    original_price: "4.49",
    sale_story: "",
    pre_price_text: "",
    post_price_text: "",
    valid_from: "2026-04-23",
    valid_to: "2026-04-29",
    ...overrides,
  };
}

describe("firstNonEmpty", () => {
  it("returns the first non-empty value", () => {
    expect(
      firstNonEmpty({ a: "", b: null, c: "x" }, ["a", "b", "c"], "fallback"),
    ).toBe("x");
  });

  it("returns the fallback when all keys are missing or empty", () => {
    expect(firstNonEmpty({}, ["a"], "fallback")).toBe("fallback");
    expect(
      firstNonEmpty({ a: null, b: undefined, c: "" }, ["a", "b", "c"], "fb"),
    ).toBe("fb");
  });

  it("skips empty arrays", () => {
    expect(firstNonEmpty({ a: [] as unknown[], b: "x" }, ["a", "b"], "fb")).toBe("x");
  });

  it("returns numeric values unchanged", () => {
    expect(firstNonEmpty({ a: 2.99 }, ["a"], "fb")).toBe(2.99);
  });
});

describe("classifyPromo", () => {
  it("classifies BOGO", () => {
    expect(classifyPromo("", "BOGO on chicken", "")).toBe("bogo");
  });

  it("classifies variant BOGO phrasing", () => {
    expect(classifyPromo("buy one get one free", "", "")).toBe("bogo");
    expect(classifyPromo("", "B1G1", "")).toBe("bogo");
    expect(classifyPromo("", "Buy 1 Get 1", "")).toBe("bogo");
  });

  it("classifies multi-buy", () => {
    expect(classifyPromo("", "2 for $5", "")).toBe("multi_buy");
    expect(classifyPromo("", "3/$10", "")).toBe("multi_buy");
    expect(classifyPromo("", "Buy 2 Get 1", "")).toBe("multi_buy");
  });

  it("classifies amount-off", () => {
    expect(classifyPromo("", "Save $2.00", "")).toBe("amount_off");
    expect(classifyPromo("", "save $3", "")).toBe("amount_off");
  });

  it("classifies percent-off", () => {
    expect(classifyPromo("", "25% off", "")).toBe("percent_off");
    expect(classifyPromo("", "50 % off", "")).toBe("percent_off");
  });

  it("defaults to 'sale' for empty input", () => {
    expect(classifyPromo("", "", "")).toBe("sale");
  });

  it("defaults to 'sale' when no regex matches", () => {
    expect(classifyPromo("", "Great deal", "")).toBe("sale");
  });

  it("applies BOGO before multi-buy when both keywords appear", () => {
    // "2 for $5" would match multi-buy, but "BOGO" wins.
    expect(classifyPromo("", "BOGO 2 for $5", "")).toBe("bogo");
  });
});

describe("parseFlippItem", () => {
  it("returns a Deal with every string field populated for a well-formed item", () => {
    const deal = parseFlippItem(baseSafewayItem(), "safeway");
    expect(deal).toEqual({
      productName: "Organic Apples",
      brand: "Gala",
      salePrice: "2.99",
      regularPrice: "4.49",
      promoType: "sale",
      validFrom: "2026-04-23",
      validTo: "2026-04-29",
      store: "safeway",
    });
  });

  it("uses 'price' fallback when 'current_price' is missing", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ current_price: undefined, price: "3.99" }),
      "safeway",
    );
    expect(deal?.salePrice).toBe("3.99");
  });

  it("uses 'sale_price' fallback when 'current_price' and 'price' are missing", () => {
    const deal = parseFlippItem(
      baseSafewayItem({
        current_price: undefined,
        price: undefined,
        sale_price: "1.99",
      }),
      "safeway",
    );
    expect(deal?.salePrice).toBe("1.99");
  });

  it("leaves regularPrice as empty string when all regular-price keys are missing", () => {
    const deal = parseFlippItem(
      baseSafewayItem({
        original_price: undefined,
        regular_price: undefined,
        was_price: undefined,
        list_price: undefined,
      }),
      "safeway",
    );
    expect(deal?.regularPrice).toBe("");
  });

  it("uses 'was_price' and 'list_price' fallbacks for regularPrice", () => {
    const wasDeal = parseFlippItem(
      baseSafewayItem({
        original_price: undefined,
        regular_price: undefined,
        was_price: "5.49",
      }),
      "safeway",
    );
    expect(wasDeal?.regularPrice).toBe("5.49");

    const listDeal = parseFlippItem(
      baseSafewayItem({
        original_price: undefined,
        regular_price: undefined,
        was_price: undefined,
        list_price: "6.99",
      }),
      "safeway",
    );
    expect(listDeal?.regularPrice).toBe("6.99");
  });

  it("stringifies numeric prices from Flipp", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ current_price: 2.99, original_price: 4.49 }),
      "safeway",
    );
    expect(deal?.salePrice).toBe("2.99");
    expect(deal?.regularPrice).toBe("4.49");
  });

  it("uses 'title' fallback for productName", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ name: undefined, title: "Apples" }),
      "safeway",
    );
    expect(deal?.productName).toBe("Apples");
  });

  it("uses 'display_name' fallback for productName", () => {
    const deal = parseFlippItem(
      baseSafewayItem({
        name: undefined,
        title: undefined,
        display_name: "Fresh Apples",
      }),
      "safeway",
    );
    expect(deal?.productName).toBe("Fresh Apples");
  });

  it("uses 'manufacturer' fallback for brand", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ brand: undefined, manufacturer: "Gala" }),
      "safeway",
    );
    expect(deal?.brand).toBe("Gala");
  });

  it("uses 'validFrom' / 'validTo' camelCase fallbacks", () => {
    const deal = parseFlippItem(
      baseSafewayItem({
        valid_from: undefined,
        validFrom: "2026-04-23",
        valid_to: undefined,
        validTo: "2026-04-29",
      }),
      "safeway",
    );
    expect(deal?.validFrom).toBe("2026-04-23");
    expect(deal?.validTo).toBe("2026-04-29");
  });

  it("classifies promo from sale_story when present", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ sale_story: "BOGO" }),
      "safeway",
    );
    expect(deal?.promoType).toBe("bogo");
  });

  it("returns null for items that do not belong to the requested store", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ merchant: "Publix Super Markets" }),
      "safeway",
    );
    expect(deal).toBeNull();
  });

  it("matches merchant case-insensitively", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ merchant: "SAFEWAY INC" }),
      "safeway",
    );
    expect(deal).not.toBeNull();
    expect(deal?.store).toBe("safeway");
  });

  it("uses merchant_name when merchant is missing", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ merchant: undefined, merchant_name: "Safeway" }),
      "safeway",
    );
    expect(deal).not.toBeNull();
  });

  it("returns null when both merchant and merchant_name are missing", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ merchant: undefined, merchant_name: undefined }),
      "safeway",
    );
    expect(deal).toBeNull();
  });

  it("tags the result with the requested store", () => {
    const deal = parseFlippItem(
      baseSafewayItem({ merchant: "ALDI" }),
      "aldi",
    );
    expect(deal?.store).toBe("aldi");
  });
});
