import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlippNetworkError, FlippUpstreamError } from "@/lib/deals/errors";
import type { StoreOutcome } from "@/lib/deals/flipp";
import type { Deal } from "@/lib/deals/types";

vi.mock("@/lib/deals/flipp", async () => {
  const actual = await vi.importActual<typeof import("@/lib/deals/flipp")>(
    "@/lib/deals/flipp",
  );
  return {
    ...actual,
    fetchAllDeals: vi.fn(),
  };
});

const { GET } = await import("./route");
const { fetchAllDeals } = await import("@/lib/deals/flipp");
const fetchAllDealsMock = vi.mocked(fetchAllDeals);

async function getBody(response: Response): Promise<unknown> {
  return await response.json();
}

function safewayDeal(name = "Apples"): Deal {
  return {
    productName: name,
    brand: "Gala",
    salePrice: "1.99",
    regularPrice: "3.49",
    promoType: "sale",
    validFrom: "2026-04-23",
    validTo: "2026-04-29",
    store: "safeway",
  };
}

function aldiDeal(name = "Bananas"): Deal {
  return {
    productName: name,
    brand: "",
    salePrice: "0.49",
    regularPrice: "",
    promoType: "sale",
    validFrom: "2026-04-23",
    validTo: "2026-04-29",
    store: "aldi",
  };
}

function fulfilled(
  store: Deal["store"],
  deals: Deal[],
  durationMs = 200,
): StoreOutcome {
  return { store, status: "fulfilled", durationMs, deals };
}

function rejected(
  store: Deal["store"],
  error: unknown,
  durationMs = 200,
): StoreOutcome {
  return { store, status: "rejected", durationMs, error };
}

describe("GET /api/deals", () => {
  beforeEach(() => {
    delete process.env.SAFEWAY_ZIP;
    delete process.env.ALDI_ZIP;
  });

  afterEach(() => {
    fetchAllDealsMock.mockReset();
    vi.restoreAllMocks();
    delete process.env.SAFEWAY_ZIP;
    delete process.env.ALDI_ZIP;
  });

  describe("happy path", () => {
    it("returns 200 with both stores' deals when both succeed", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [safewayDeal(), aldiDeal()],
        perStore: [
          fulfilled("safeway", [safewayDeal()]),
          fulfilled("aldi", [aldiDeal()]),
        ],
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const body = (await getBody(response)) as Deal[];
      expect(body).toHaveLength(2);
      expect(response.headers.get("X-Deals-Stores")).toBe("safeway,aldi");
      expect(response.headers.get("X-Deals-Errors")).toBeNull();
    });

    it("uses the default ZIP when env vars are unset", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [
          fulfilled("safeway", []),
          fulfilled("aldi", []),
        ],
      });

      await GET();

      expect(fetchAllDealsMock).toHaveBeenCalledWith({
        safewayZip: "34238",
        aldiZip: "34238",
      });
    });

    it("passes the configured ZIPs from env", async () => {
      process.env.SAFEWAY_ZIP = "12345";
      process.env.ALDI_ZIP = "67890";
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [fulfilled("safeway", []), fulfilled("aldi", [])],
      });

      await GET();

      expect(fetchAllDealsMock).toHaveBeenCalledWith({
        safewayZip: "12345",
        aldiZip: "67890",
      });
    });
  });

  describe("X-Deals-Source header", () => {
    it("is 'cache' when both fulfilled stores resolve under 50ms", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [
          fulfilled("safeway", [], 10),
          fulfilled("aldi", [], 20),
        ],
      });

      const response = await GET();
      expect(response.headers.get("X-Deals-Source")).toBe("cache");
    });

    it("is 'network' when both fulfilled stores take over 50ms", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [
          fulfilled("safeway", [], 300),
          fulfilled("aldi", [], 400),
        ],
      });

      const response = await GET();
      expect(response.headers.get("X-Deals-Source")).toBe("network");
    });

    it("is 'mixed' when one is fast and one is slow", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [
          fulfilled("safeway", [], 10),
          fulfilled("aldi", [], 400),
        ],
      });

      const response = await GET();
      expect(response.headers.get("X-Deals-Source")).toBe("mixed");
    });

    it("is 'unknown' when every store failed", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [
          rejected("safeway", new FlippNetworkError("safeway", new Error("x"))),
          rejected("aldi", new FlippUpstreamError("aldi", 500)),
        ],
      });

      const response = await GET();
      expect(response.headers.get("X-Deals-Source")).toBe("unknown");
    });
  });

  describe("partial failure", () => {
    it("returns 200 with the successful store's deals when the other fails", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [safewayDeal()],
        perStore: [
          fulfilled("safeway", [safewayDeal()]),
          rejected("aldi", new FlippUpstreamError("aldi", 503)),
        ],
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const body = (await getBody(response)) as Deal[];
      expect(body).toHaveLength(1);
      expect(body[0].store).toBe("safeway");
      expect(response.headers.get("X-Deals-Stores")).toBe("safeway");
      expect(response.headers.get("X-Deals-Errors")).toBe("aldi");
    });
  });

  describe("all stores fail", () => {
    it("returns 502 with an error envelope naming each failure", async () => {
      fetchAllDealsMock.mockResolvedValueOnce({
        deals: [],
        perStore: [
          rejected(
            "safeway",
            new FlippNetworkError("safeway", new Error("dns")),
          ),
          rejected("aldi", new FlippUpstreamError("aldi", 500)),
        ],
      });

      const response = await GET();

      expect(response.status).toBe(502);
      const body = (await getBody(response)) as {
        error: string;
        details: Array<{ store: string; message: string }>;
      };
      expect(body.error).toBe("All deal sources failed");
      expect(body.details).toHaveLength(2);
      expect(body.details[0].store).toBe("safeway");
      expect(body.details[0].message).toMatch(/dns/);
      expect(body.details[1].store).toBe("aldi");
      expect(body.details[1].message).toMatch(/500/);
      expect(response.headers.get("X-Deals-Stores")).toBeNull();
      expect(response.headers.get("X-Deals-Errors")).toBe("safeway,aldi");
      expect(response.headers.get("X-Deals-Source")).toBe("unknown");
    });
  });

  describe("env validation", () => {
    it("returns 500 with a clear message when SAFEWAY_ZIP is invalid", async () => {
      process.env.SAFEWAY_ZIP = "abc";

      const response = await GET();

      expect(response.status).toBe(500);
      const body = (await getBody(response)) as { error: string };
      expect(body.error).toMatch(/SAFEWAY_ZIP/);
      expect(fetchAllDealsMock).not.toHaveBeenCalled();
    });

    it("returns 500 with a clear message when ALDI_ZIP is invalid", async () => {
      process.env.ALDI_ZIP = "12";

      const response = await GET();

      expect(response.status).toBe(500);
      const body = (await getBody(response)) as { error: string };
      expect(body.error).toMatch(/ALDI_ZIP/);
      expect(fetchAllDealsMock).not.toHaveBeenCalled();
    });
  });

  describe("unexpected errors", () => {
    it("returns 500 without leaking the error message on an unknown throw", async () => {
      fetchAllDealsMock.mockRejectedValueOnce(new TypeError("internal crash"));

      const response = await GET();

      expect(response.status).toBe(500);
      const body = (await getBody(response)) as { error: string };
      expect(body.error).toBe("Unexpected error");
      expect(body.error).not.toMatch(/internal crash/);
    });
  });
});
