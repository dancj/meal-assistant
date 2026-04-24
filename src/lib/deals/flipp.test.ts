import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllDeals, fetchDealsFromFlipp } from "./flipp";
import { FlippNetworkError, FlippUpstreamError } from "./errors";

type FetchArgs = Parameters<typeof fetch>;
type MockResponder = (
  input: FetchArgs[0],
  init?: FetchArgs[1],
) => Response | Promise<Response>;

function makeResponse(body: unknown, init: ResponseInit = {}): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function installFetchMock(responder: MockResponder): {
  calls: Array<{ url: string; init?: FetchArgs[1] }>;
} {
  const calls: Array<{ url: string; init?: FetchArgs[1] }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: FetchArgs[0], init?: FetchArgs[1]) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(responder(input, init));
    }),
  );
  return { calls };
}

function safewayItem(overrides: Record<string, unknown> = {}) {
  return {
    merchant_name: "SAFEWAY",
    name: "Chicken Breast",
    brand: "Signature Farms",
    current_price: 3.99,
    original_price: 5.99,
    valid_from: "2026-04-23",
    valid_to: "2026-04-29",
    ...overrides,
  };
}

function publixItem(overrides: Record<string, unknown> = {}) {
  return {
    merchant_name: "Publix Super Markets",
    name: "Bread",
    brand: "Publix",
    current_price: 2.49,
    original_price: 3.49,
    valid_from: "2026-04-23",
    valid_to: "2026-04-29",
    ...overrides,
  };
}

describe("fetchDealsFromFlipp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("URL + cache options", () => {
    it("builds the correct URL for safeway", async () => {
      const { calls } = installFetchMock(() => makeResponse({ items: [] }));
      await fetchDealsFromFlipp("safeway", "12345");
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(
        "https://backflipp.wishabi.com/flipp/items/search?locale=en-us&postal_code=12345&q=safeway",
      );
    });

    it("builds the correct URL for aldi", async () => {
      const { calls } = installFetchMock(() => makeResponse({ items: [] }));
      await fetchDealsFromFlipp("aldi", "34238");
      expect(calls[0].url).toContain("postal_code=34238");
      expect(calls[0].url).toContain("q=aldi");
    });

    it("passes the 6-hour revalidate cache option to fetch", async () => {
      const { calls } = installFetchMock(() => makeResponse({ items: [] }));
      await fetchDealsFromFlipp("safeway", "12345");
      const init = calls[0].init as RequestInit & {
        next?: { revalidate?: number };
      };
      expect(init?.next?.revalidate).toBe(21600);
    });

    it("passes an AbortSignal to fetch", async () => {
      const { calls } = installFetchMock(() => makeResponse({ items: [] }));
      await fetchDealsFromFlipp("safeway", "12345");
      expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("happy paths", () => {
    it("parses safeway items and filters out non-safeway items", async () => {
      installFetchMock(() =>
        makeResponse({
          items: [
            safewayItem({ name: "Apples" }),
            publixItem(),
            safewayItem({ name: "Bananas" }),
          ],
        }),
      );
      const deals = await fetchDealsFromFlipp("safeway", "12345");
      expect(deals).toHaveLength(2);
      expect(deals.map((d) => d.productName)).toEqual(["Apples", "Bananas"]);
      expect(deals.every((d) => d.store === "safeway")).toBe(true);
    });

    it("falls back to the 'results' key when 'items' is missing", async () => {
      installFetchMock(() =>
        makeResponse({ results: [safewayItem({ name: "Eggs" })] }),
      );
      const deals = await fetchDealsFromFlipp("safeway", "12345");
      expect(deals).toHaveLength(1);
      expect(deals[0].productName).toBe("Eggs");
    });

    it("returns an empty array when items is empty", async () => {
      installFetchMock(() => makeResponse({ items: [] }));
      const deals = await fetchDealsFromFlipp("safeway", "12345");
      expect(deals).toEqual([]);
    });

    it("returns an empty array when no items match the merchant token", async () => {
      installFetchMock(() => makeResponse({ items: [publixItem(), publixItem()] }));
      const deals = await fetchDealsFromFlipp("safeway", "12345");
      expect(deals).toEqual([]);
    });

    it("handles real-shape items with null merchant and numeric prices", async () => {
      installFetchMock(() =>
        makeResponse({
          items: [
            {
              merchant: null,
              merchant_name: "ALDI",
              name: "ALDI Greek Chickpeas",
              brand: null,
              current_price: 2.29,
              original_price: null,
              valid_from: "2026-04-22T04:00:00+00:00",
              valid_to: "2026-04-29T03:59:59+00:00",
              sale_story: null,
              pre_price_text: null,
              post_price_text: null,
            },
          ],
        }),
      );
      const deals = await fetchDealsFromFlipp("aldi", "34238");
      expect(deals).toHaveLength(1);
      expect(deals[0]).toMatchObject({
        productName: "ALDI Greek Chickpeas",
        brand: "",
        salePrice: "2.29",
        regularPrice: "",
        promoType: "sale",
        store: "aldi",
      });
    });

    it("skips non-object entries in the items array", async () => {
      installFetchMock(() =>
        makeResponse({ items: [null, "a string", safewayItem(), 42] }),
      );
      const deals = await fetchDealsFromFlipp("safeway", "12345");
      expect(deals).toHaveLength(1);
    });
  });

  describe("upstream errors", () => {
    it("throws FlippUpstreamError on 500", async () => {
      installFetchMock(() => makeResponse("server error", { status: 500 }));
      await expect(fetchDealsFromFlipp("safeway", "12345")).rejects.toThrow(
        FlippUpstreamError,
      );
    });

    it("throws FlippUpstreamError on 429 with the status preserved", async () => {
      installFetchMock(() => makeResponse("rate limited", { status: 429 }));
      try {
        await fetchDealsFromFlipp("aldi", "12345");
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(FlippUpstreamError);
        expect((err as FlippUpstreamError).status).toBe(429);
        expect((err as FlippUpstreamError).store).toBe("aldi");
      }
    });

    it("does not attempt to parse JSON when the response is non-2xx", async () => {
      // Body is HTML; a JSON.parse call would throw a different error.
      installFetchMock(() =>
        new Response("<html>bad gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      );
      await expect(fetchDealsFromFlipp("safeway", "12345")).rejects.toThrow(
        FlippUpstreamError,
      );
    });
  });

  describe("network errors", () => {
    it("wraps fetch rejections as FlippNetworkError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("dns failure"))),
      );
      await expect(fetchDealsFromFlipp("safeway", "12345")).rejects.toThrow(
        FlippNetworkError,
      );
      await expect(fetchDealsFromFlipp("safeway", "12345")).rejects.toThrow(
        /dns failure/,
      );
    });

    it("wraps JSON-parse failures as FlippNetworkError", async () => {
      installFetchMock(
        () =>
          new Response("not valid json", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );
      await expect(fetchDealsFromFlipp("safeway", "12345")).rejects.toThrow(
        FlippNetworkError,
      );
    });

    it("aborts the fetch after the timeout", async () => {
      vi.useFakeTimers();
      let abortedSignal: AbortSignal | null = null;
      vi.stubGlobal(
        "fetch",
        vi.fn((_input: FetchArgs[0], init?: FetchArgs[1]) => {
          abortedSignal = init?.signal ?? null;
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          });
        }),
      );
      const promise = fetchDealsFromFlipp("safeway", "12345");
      vi.advanceTimersByTime(10_001);
      await expect(promise).rejects.toThrow(FlippNetworkError);
      expect(abortedSignal).not.toBeNull();
      expect(abortedSignal!.aborted).toBe(true);
    });
  });
});

describe("fetchAllDeals", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("runs both store fetches concurrently and concatenates in safeway,aldi order", async () => {
    let peakConcurrent = 0;
    let inFlight = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: FetchArgs[0]) => {
        inFlight += 1;
        peakConcurrent = Math.max(peakConcurrent, inFlight);
        // Yield so both fetches can start before either resolves.
        await Promise.resolve();
        await Promise.resolve();
        inFlight -= 1;
        const url = String(input);
        if (url.includes("q=safeway")) {
          return makeResponse({
            items: [
              {
                merchant_name: "Safeway",
                name: "Apples",
                current_price: "1.99",
              },
            ],
          });
        }
        return makeResponse({
          items: [
            { merchant_name: "ALDI", name: "Bananas", current_price: "0.49" },
          ],
        });
      }),
    );

    const result = await fetchAllDeals({
      safewayZip: "12345",
      aldiZip: "34238",
    });

    expect(peakConcurrent).toBe(2);
    expect(result.perStore.map((p) => p.store)).toEqual(["safeway", "aldi"]);
    expect(result.perStore.every((p) => p.status === "fulfilled")).toBe(true);
    expect(result.deals.map((d) => d.productName)).toEqual(["Apples", "Bananas"]);
  });

  it("returns partial deals when one store fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: FetchArgs[0]) => {
        const url = String(input);
        if (url.includes("q=safeway")) {
          return makeResponse({ items: [safewayItem()] });
        }
        return makeResponse("upstream error", { status: 503 });
      }),
    );

    const result = await fetchAllDeals({
      safewayZip: "12345",
      aldiZip: "34238",
    });

    expect(result.perStore).toHaveLength(2);
    expect(result.perStore[0].status).toBe("fulfilled");
    expect(result.perStore[1].status).toBe("rejected");
    expect(result.deals).toHaveLength(1);
    expect(result.deals[0].store).toBe("safeway");

    const rejected = result.perStore[1];
    if (rejected.status !== "rejected") throw new Error("expected rejected");
    expect(rejected.error).toBeInstanceOf(FlippUpstreamError);
  });

  it("returns empty deals with both rejected when both stores fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: FetchArgs[0]) => {
        const url = String(input);
        if (url.includes("q=safeway")) {
          // Reject via network error
          throw new Error("dns failure");
        }
        return makeResponse("upstream", { status: 500 });
      }),
    );

    const result = await fetchAllDeals({
      safewayZip: "12345",
      aldiZip: "34238",
    });

    expect(result.deals).toEqual([]);
    expect(result.perStore.every((p) => p.status === "rejected")).toBe(true);
    const safeway = result.perStore[0];
    const aldi = result.perStore[1];
    if (safeway.status !== "rejected" || aldi.status !== "rejected") {
      throw new Error("expected both rejected");
    }
    expect(safeway.error).toBeInstanceOf(FlippNetworkError);
    expect(aldi.error).toBeInstanceOf(FlippUpstreamError);
  });

  it("records a durationMs on every outcome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeResponse({ items: [] })),
    );

    const result = await fetchAllDeals({
      safewayZip: "12345",
      aldiZip: "34238",
    });

    for (const outcome of result.perStore) {
      expect(typeof outcome.durationMs).toBe("number");
      expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns an empty deals list from a store whose flyer has no matching items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: FetchArgs[0]) => {
        const url = String(input);
        if (url.includes("q=safeway")) {
          return makeResponse({ items: [] });
        }
        return makeResponse({ items: [{ merchant_name: "ALDI", name: "Rice" }] });
      }),
    );

    const result = await fetchAllDeals({
      safewayZip: "12345",
      aldiZip: "34238",
    });

    expect(result.perStore[0].status).toBe("fulfilled");
    if (result.perStore[0].status !== "fulfilled") return;
    expect(result.perStore[0].deals).toEqual([]);
    expect(result.deals).toHaveLength(1);
    expect(result.deals[0].store).toBe("aldi");
  });
});
