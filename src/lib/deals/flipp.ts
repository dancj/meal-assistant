import { FlippNetworkError, FlippUpstreamError } from "./errors";
import { parseFlippItem } from "./parse";
import { MERCHANTS, STORES, type Deal, type Store } from "./types";

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

export interface FulfilledStoreOutcome {
  store: Store;
  status: "fulfilled";
  durationMs: number;
  deals: Deal[];
}

export interface RejectedStoreOutcome {
  store: Store;
  status: "rejected";
  durationMs: number;
  error: unknown;
}

export type StoreOutcome = FulfilledStoreOutcome | RejectedStoreOutcome;

export interface AllDealsResult {
  deals: Deal[];
  perStore: StoreOutcome[];
}

export interface FetchAllDealsInput {
  safewayZip: string;
  aldiZip: string;
}

async function timed(
  store: Store,
  task: () => Promise<Deal[]>,
): Promise<StoreOutcome> {
  const startedAt = Date.now();
  try {
    const deals = await task();
    return {
      store,
      status: "fulfilled",
      durationMs: Date.now() - startedAt,
      deals,
    };
  } catch (error) {
    return {
      store,
      status: "rejected",
      durationMs: Date.now() - startedAt,
      error,
    };
  }
}

export async function fetchAllDeals({
  safewayZip,
  aldiZip,
}: FetchAllDealsInput): Promise<AllDealsResult> {
  const zipByStore: Record<Store, string> = {
    safeway: safewayZip,
    aldi: aldiZip,
  };

  const perStore = await Promise.all(
    STORES.map((store) =>
      timed(store, () => fetchDealsFromFlipp(store, zipByStore[store])),
    ),
  );

  const deals: Deal[] = [];
  for (const outcome of perStore) {
    if (outcome.status === "fulfilled") {
      deals.push(...outcome.deals);
    }
  }
  return { deals, perStore };
}
