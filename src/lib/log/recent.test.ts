import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubAuthError } from "@/lib/recipes/github";
import { InvalidLogRequestError } from "./errors";
import { LogParseError } from "./parse";
import { fetchRecentLogs } from "./recent";

const ENV_KEYS = ["GITHUB_PAT", "RECIPES_REPO"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) originalEnv[k] = process.env[k];
  process.env.GITHUB_PAT = "ghp_test";
  process.env.RECIPES_REPO = "owner/repo";
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
  vi.restoreAllMocks();
});

function buildFile(weeks: string[]): string {
  return weeks
    .map(
      (w) => `---
week: ${w}
cooked: []
skipped: []
---`,
    )
    .join("\n");
}

function listing(names: string[]): unknown[] {
  return names.map((name) => ({
    type: "file",
    name,
    url: `https://files.local/${name}`,
  }));
}

describe("fetchRecentLogs — input validation", () => {
  it.each([0, -1, 53, 1.5, NaN])("rejects weeks=%s", async (n) => {
    await expect(fetchRecentLogs(n as number)).rejects.toBeInstanceOf(
      InvalidLogRequestError,
    );
  });
});

describe("fetchRecentLogs — happy paths", () => {
  it("returns last N entries newest-first across two monthly files", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/contents/log")) {
        return new Response(JSON.stringify(listing(["2026-04.md", "2026-03.md"])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("2026-04.md")) {
        return new Response(
          buildFile(["2026-04-06", "2026-04-13", "2026-04-20"]),
          { status: 200 },
        );
      }
      return new Response(
        buildFile(["2026-03-09", "2026-03-16", "2026-03-23", "2026-03-30"]),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const got = await fetchRecentLogs(5);
    expect(got.map((e) => e.week)).toEqual([
      "2026-04-20",
      "2026-04-13",
      "2026-04-06",
      "2026-03-30",
      "2026-03-23",
    ]);
  });

  it("returns 8 entries from a single 10-week file when only one file exists", async () => {
    const weeks = Array.from({ length: 10 }, (_, i) => `2026-04-${String(i + 1).padStart(2, "0")}`);
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/contents/log")) {
        return new Response(JSON.stringify(listing(["2026-04.md"])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(buildFile(weeks), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const got = await fetchRecentLogs(8);
    expect(got).toHaveLength(8);
    expect(got[0].week).toBe("2026-04-10");
    expect(got[7].week).toBe("2026-04-03");
  });

  it("returns [] when /log/ does not exist (404)", async () => {
    const fetchMock = vi.fn(async () => new Response("Not Found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRecentLogs(8)).toEqual([]);
  });

  it("returns [] when /log/ exists but is empty", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/contents/log")) {
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRecentLogs(8)).toEqual([]);
  });

  it("requests only N entries when fewer than N exist", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/contents/log")) {
        return new Response(JSON.stringify(listing(["2026-04.md"])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(buildFile(["2026-04-13", "2026-04-20"]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const got = await fetchRecentLogs(8);
    expect(got).toHaveLength(2);
  });

  it("ignores files that do not match YYYY-MM.md", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/contents/log")) {
        return new Response(
          JSON.stringify(listing(["README.md", "notes.md", "2026-04.md"])),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response(buildFile(["2026-04-13"]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const got = await fetchRecentLogs(8);
    expect(got.map((e) => e.week)).toEqual(["2026-04-13"]);
  });
});

describe("fetchRecentLogs — error paths", () => {
  it("propagates GitHubAuthError from listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 })),
    );
    await expect(fetchRecentLogs(8)).rejects.toBeInstanceOf(GitHubAuthError);
  });

  it("propagates LogParseError from a malformed file", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/contents/log")) {
        return new Response(JSON.stringify(listing(["2026-04.md"])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("---\ncooked: []\nskipped: []\n---\n", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchRecentLogs(8)).rejects.toBeInstanceOf(LogParseError);
  });
});
