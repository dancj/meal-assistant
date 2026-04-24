import { MERCHANTS, type Deal, type PromoType, type Store } from "./types";

type FlippItem = Record<string, unknown>;

export function firstNonEmpty<T>(
  source: Record<string, unknown>,
  keys: readonly string[],
  fallback: T,
): T | string | number {
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return value as T | string | number;
  }
  return fallback;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

const BOGO_RX = /\b(bogo|b1g1|buy\s*one\s*get\s*one|buy\s*1\s*get\s*1)\b/i;
const MULTI_BUY_RX = /(\d+\s*(?:for|\/)\s*\$?\d+|\bbuy\s*\d+\s*get\s*\d+)/i;
const AMOUNT_OFF_RX = /save\s*\$?\s*\d+(?:\.\d+)?/i;
const PERCENT_OFF_RX = /\d+\s*%\s*off/i;

export function classifyPromo(
  pre: string,
  story: string,
  post: string,
): PromoType {
  const blob = [pre, story, post].filter(Boolean).join(" ").trim();
  if (blob === "") return "sale";
  if (BOGO_RX.test(blob)) return "bogo";
  if (MULTI_BUY_RX.test(blob)) return "multi_buy";
  if (AMOUNT_OFF_RX.test(blob)) return "amount_off";
  if (PERCENT_OFF_RX.test(blob)) return "percent_off";
  return "sale";
}

function merchantMatches(item: FlippItem, token: string): boolean {
  const merchant = firstNonEmpty(item, ["merchant", "merchant_name"], "");
  const asText = typeof merchant === "string" ? merchant : "";
  if (asText === "") return false;
  return asText.toLowerCase().includes(token.toLowerCase());
}

export function parseFlippItem(item: FlippItem, store: Store): Deal | null {
  const { token } = MERCHANTS[store];
  if (!merchantMatches(item, token)) return null;

  const pre = asString(
    firstNonEmpty(item, ["pre_price_text", "prePriceText"], ""),
  );
  const story = asString(
    firstNonEmpty(item, ["sale_story", "saleStory"], ""),
  );
  const post = asString(
    firstNonEmpty(item, ["post_price_text", "postPriceText"], ""),
  );

  return {
    productName: asString(
      firstNonEmpty(item, ["name", "title", "display_name"], ""),
    ),
    brand: asString(firstNonEmpty(item, ["brand", "manufacturer"], "")),
    salePrice: asString(
      firstNonEmpty(item, ["current_price", "price", "sale_price"], ""),
    ),
    regularPrice: asString(
      firstNonEmpty(
        item,
        ["original_price", "regular_price", "was_price", "list_price"],
        "",
      ),
    ),
    promoType: classifyPromo(pre, story, post),
    validFrom: asString(
      firstNonEmpty(item, ["valid_from", "validFrom", "start_date"], ""),
    ),
    validTo: asString(
      firstNonEmpty(item, ["valid_to", "validTo", "end_date"], ""),
    ),
    store,
  };
}
