import { FlippNetworkError, FlippUpstreamError } from "./errors";
import { parseFlippItem } from "./parse";
import { MERCHANTS, type Deal, type Store } from "./types";

const FLIPP_SEARCH_URL = "https://backflipp.wishabi.com/flipp/items/search";
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const FETCH_TIMEOUT_MS = 10_000;

function buildSearchUrl(zip: string, merchantToken: string): string {
  const params = new URLSearchParams({
    locale: "en-us",
    postal_code: zip,
    q: merchantToken,
  });
  return `${FLIPP_SEARCH_URL}?${params.toString()}`;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      next: { revalidate: CACHE_TTL_SECONDS },
    });
  } finally {
    clearTimeout(timer);
  }
}

interface FlippSearchPayload {
  items?: unknown[];
  results?: unknown[];
}

export async function fetchDealsFromFlipp(
  store: Store,
  zip: string,
): Promise<Deal[]> {
  const { token } = MERCHANTS[store];
  const url = buildSearchUrl(zip, token);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  } catch (err) {
    throw new FlippNetworkError(store, err);
  }

  if (!response.ok) {
    throw new FlippUpstreamError(store, response.status);
  }

  let payload: FlippSearchPayload;
  try {
    payload = (await response.json()) as FlippSearchPayload;
  } catch (err) {
    throw new FlippNetworkError(store, err);
  }

  const rawItems = payload.items ?? payload.results ?? [];
  const deals: Deal[] = [];
  for (const raw of rawItems) {
    if (raw === null || typeof raw !== "object") continue;
    const deal = parseFlippItem(raw as Record<string, unknown>, store);
    if (deal !== null) deals.push(deal);
  }
  return deals;
}
