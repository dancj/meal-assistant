import { readEnvZip } from "@/lib/deals/env";
import { InvalidZipError } from "@/lib/deals/errors";
import { fetchAllDeals, type StoreOutcome } from "@/lib/deals/flipp";
import { DEFAULT_ZIP } from "@/lib/deals/types";
import { DEMO_DEALS, isDemoMode } from "@/lib/demo/fixtures";

export const runtime = "nodejs";

const CACHE_HIT_THRESHOLD_MS = 50;

function buildHeaders(perStore: StoreOutcome[]): Headers {
  const headers = new Headers();
  const fulfilled = perStore.filter((p) => p.status === "fulfilled");
  const rejected = perStore.filter((p) => p.status === "rejected");

  const stores = fulfilled.map((p) => p.store).join(",");
  if (stores !== "") {
    headers.set("X-Deals-Stores", stores);
  }

  if (rejected.length > 0) {
    headers.set("X-Deals-Errors", rejected.map((p) => p.store).join(","));
  }

  if (fulfilled.length === 0) {
    headers.set("X-Deals-Source", "unknown");
  } else {
    const allCached = fulfilled.every(
      (p) => p.durationMs < CACHE_HIT_THRESHOLD_MS,
    );
    const anyCached = fulfilled.some(
      (p) => p.durationMs < CACHE_HIT_THRESHOLD_MS,
    );
    if (allCached) {
      headers.set("X-Deals-Source", "cache");
    } else if (anyCached) {
      headers.set("X-Deals-Source", "mixed");
    } else {
      headers.set("X-Deals-Source", "network");
    }
  }

  return headers;
}

export async function GET(): Promise<Response> {
  if (isDemoMode()) {
    return Response.json(DEMO_DEALS, {
      headers: {
        "X-Demo-Mode": "1",
        "X-Deals-Source": "demo",
      },
    });
  }

  let safewayZip: string;
  let aldiZip: string;
  try {
    safewayZip = readEnvZip("SAFEWAY_ZIP", DEFAULT_ZIP);
    aldiZip = readEnvZip("ALDI_ZIP", DEFAULT_ZIP);
  } catch (err) {
    if (err instanceof InvalidZipError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    console.error("Unexpected /api/deals env error", err);
    return Response.json(
      { error: "Unexpected error reading configuration" },
      { status: 500 },
    );
  }

  try {
    const { deals, perStore } = await fetchAllDeals({ safewayZip, aldiZip });
    const headers = buildHeaders(perStore);

    const allRejected = perStore.every((p) => p.status === "rejected");
    if (allRejected) {
      const details = perStore.map((p) => ({
        store: p.store,
        message:
          p.status === "rejected" && p.error instanceof Error
            ? p.error.message
            : "unknown error",
      }));
      return Response.json(
        { error: "All deal sources failed", details },
        { status: 502, headers },
      );
    }

    return Response.json(deals, { status: 200, headers });
  } catch (err) {
    console.error("Unexpected /api/deals error", err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
}
