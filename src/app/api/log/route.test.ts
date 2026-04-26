import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const upsertMock = vi.fn();
const fetchRecentMock = vi.fn();

vi.mock("@/lib/log/github", async () => {
  const actual = await vi.importActual<typeof import("@/lib/log/github")>(
    "@/lib/log/github",
  );
  return {
    ...actual,
    upsertWeekEntry: (entry: unknown) => upsertMock(entry),
  };
});

vi.mock("@/lib/log/recent", async () => {
  const actual = await vi.importActual<typeof import("@/lib/log/recent")>(
    "@/lib/log/recent",
  );
  return {
    ...actual,
    fetchRecentLogs: (weeks: number) => fetchRecentMock(weeks),
  };
});

import {
  GitHubAuthError,
  GitHubConflictError,
} from "@/lib/log/github";

beforeEach(() => {
  upsertMock.mockReset();
  fetchRecentMock.mockReset();
  delete process.env.DEMO_MODE;
});

afterEach(() => {
  vi.clearAllMocks();
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/log${query}`);
}

describe("POST /api/log — happy paths", () => {
  it("calls upsertWeekEntry and returns 200 on valid body", async () => {
    upsertMock.mockResolvedValue(undefined);
    const res = await POST(
      postRequest({ week: "2026-04-20", cooked: ["tacos"], skipped: [] }),
    );
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith({
      week: "2026-04-20",
      cooked: ["tacos"],
      skipped: [],
    });
  });

  it("includes skipReason in upsert payload when present", async () => {
    upsertMock.mockResolvedValue(undefined);
    await POST(
      postRequest({
        week: "2026-04-20",
        cooked: [],
        skipped: ["x"],
        skipReason: "kid was sick",
      }),
    );
    expect(upsertMock).toHaveBeenCalledWith({
      week: "2026-04-20",
      cooked: [],
      skipped: ["x"],
      skipReason: "kid was sick",
    });
  });

  it("DEMO_MODE=1 returns 200 with X-Demo-Mode and skips upsert", async () => {
    process.env.DEMO_MODE = "1";
    const res = await POST(
      postRequest({ week: "2026-04-20", cooked: [], skipped: [] }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/log — validation errors", () => {
  it("400 on malformed JSON", async () => {
    const req = new Request("http://localhost/api/log", {
      method: "POST",
      body: "{broken",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 when week is missing", async () => {
    const res = await POST(postRequest({ cooked: [], skipped: [] }));
    expect(res.status).toBe(400);
  });

  it("400 when week is malformed", async () => {
    const res = await POST(
      postRequest({ week: "2026/04/20", cooked: [], skipped: [] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.field).toBe("week");
  });

  it("400 when cooked is not an array of strings", async () => {
    const res = await POST(
      postRequest({ week: "2026-04-20", cooked: "no", skipped: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("400 when cooked contains an empty string", async () => {
    const res = await POST(
      postRequest({ week: "2026-04-20", cooked: [""], skipped: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("400 when cooked and skipped intersect", async () => {
    const res = await POST(
      postRequest({
        week: "2026-04-20",
        cooked: ["tacos"],
        skipped: ["tacos"],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot also appear/);
  });

  it("400 when skipReason is non-string", async () => {
    const res = await POST(
      postRequest({
        week: "2026-04-20",
        cooked: [],
        skipped: [],
        skipReason: 5,
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/log — upstream errors", () => {
  it("502 on GitHubAuthError with write-scope hint", async () => {
    upsertMock.mockRejectedValue(new GitHubAuthError(403));
    const res = await POST(
      postRequest({ week: "2026-04-20", cooked: [], skipped: [] }),
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/Contents: Write/);
  });

  it("502 on GitHubConflictError after retry", async () => {
    upsertMock.mockRejectedValue(new GitHubConflictError("two 409s"));
    const res = await POST(
      postRequest({ week: "2026-04-20", cooked: [], skipped: [] }),
    );
    expect(res.status).toBe(502);
  });
});

describe("GET /api/log — happy paths", () => {
  it("calls fetchRecentLogs with default weeks=8 when no query", async () => {
    fetchRecentMock.mockResolvedValue([]);
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(fetchRecentMock).toHaveBeenCalledWith(8);
  });

  it("uses query weeks when valid", async () => {
    fetchRecentMock.mockResolvedValue([]);
    await GET(getRequest("?weeks=5"));
    expect(fetchRecentMock).toHaveBeenCalledWith(5);
  });

  it("returns the reader's array verbatim", async () => {
    const logs = [{ week: "2026-04-20", cooked: ["a"], skipped: [] }];
    fetchRecentMock.mockResolvedValue(logs);
    const res = await GET(getRequest());
    expect(await res.json()).toEqual(logs);
  });

  it("DEMO_MODE=1 returns DEMO_LOGS without calling reader", async () => {
    process.env.DEMO_MODE = "1";
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    expect(fetchRecentMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("DEMO_MODE=1 honors weeks query for slicing fixtures", async () => {
    process.env.DEMO_MODE = "1";
    const res = await GET(getRequest("?weeks=1"));
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe("GET /api/log — validation errors", () => {
  it("400 on weeks=0", async () => {
    expect((await GET(getRequest("?weeks=0"))).status).toBe(400);
  });

  it("400 on weeks=99", async () => {
    expect((await GET(getRequest("?weeks=99"))).status).toBe(400);
  });

  it("400 on weeks=foo", async () => {
    expect((await GET(getRequest("?weeks=foo"))).status).toBe(400);
  });

  it("502 on GitHubAuthError from reader", async () => {
    fetchRecentMock.mockRejectedValue(new GitHubAuthError(401));
    expect((await GET(getRequest())).status).toBe(502);
  });
});
