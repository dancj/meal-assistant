import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GitHubAuthError,
  GitHubConflictError,
  GitHubUpstreamError,
  MissingEnvVarError,
  getLogFile,
  upsertWeekEntry,
} from "./github";

const ENV_KEYS = ["GITHUB_PAT", "RECIPES_REPO"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) originalEnv[k] = process.env[k];
  process.env.GITHUB_PAT = "ghp_test_secret_value";
  process.env.RECIPES_REPO = "owner/repo";
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

function b64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

const SAMPLE_FILE = `---
week: 2026-04-13
cooked: [tacos]
skipped: []
---
`;

describe("getLogFile", () => {
  it("returns null on 404", async () => {
    const fetchMock = vi.fn(async () => textResponse("Not Found", 404));
    vi.stubGlobal("fetch", fetchMock);
    const got = await getLogFile("2026-04");
    expect(got).toBeNull();
  });

  it("returns decoded content + sha on 200", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        type: "file",
        content: b64(SAMPLE_FILE),
        encoding: "base64",
        sha: "abc123",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const got = await getLogFile("2026-04");
    expect(got?.sha).toBe("abc123");
    expect(got?.content).toBe(SAMPLE_FILE);
  });

  it("throws GitHubAuthError on 401/403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("forbidden", 403)),
    );
    await expect(getLogFile("2026-04")).rejects.toBeInstanceOf(GitHubAuthError);
  });

  it("throws MissingEnvVarError when GITHUB_PAT unset", async () => {
    delete process.env.GITHUB_PAT;
    await expect(getLogFile("2026-04")).rejects.toBeInstanceOf(
      MissingEnvVarError,
    );
  });

  it("never interpolates GITHUB_PAT into upstream error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => textResponse("server explosion", 500)),
    );
    try {
      await getLogFile("2026-04");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubUpstreamError);
      expect((err as Error).message).not.toContain("ghp_test_secret_value");
    }
  });
});

describe("upsertWeekEntry — create file", () => {
  it("PUTs without sha when no file exists, with serialized single block", async () => {
    const calls: { method: string; url: string; body?: string }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        method: (init?.method as string | undefined) ?? "GET",
        url,
        body: init?.body as string | undefined,
      });
      if ((init?.method as string | undefined) === "PUT") {
        return jsonResponse({ ok: true }, 201);
      }
      return textResponse("Not Found", 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await upsertWeekEntry({
      week: "2026-04-20",
      cooked: ["tacos", "salmon"],
      skipped: [],
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe("GET");
    expect(calls[1].method).toBe("PUT");

    const putBody = JSON.parse(calls[1].body ?? "{}");
    expect(putBody.sha).toBeUndefined();
    expect(typeof putBody.content).toBe("string");
    const decoded = Buffer.from(putBody.content, "base64").toString("utf8");
    expect(decoded).toContain("week: 2026-04-20");
    expect(decoded).toContain("cooked: [tacos, salmon]");
  });
});

describe("upsertWeekEntry — update existing", () => {
  it("PUTs with sha and merged sorted blocks when adding a new week", async () => {
    const calls: { method: string; body?: string }[] = [];
    let putBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method as string | undefined) ?? "GET";
      calls.push({ method, body: init?.body as string | undefined });
      if (method === "PUT") {
        putBody = JSON.parse(init?.body as string);
        return jsonResponse({ ok: true }, 200);
      }
      return jsonResponse({
        type: "file",
        content: b64(SAMPLE_FILE),
        encoding: "base64",
        sha: "existing-sha",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await upsertWeekEntry({
      week: "2026-04-20",
      cooked: ["chicken-tacos"],
      skipped: ["pasta-bake"],
      skipReason: "tired",
    });

    expect(putBody?.sha).toBe("existing-sha");
    const decoded = Buffer.from(
      putBody?.content as string,
      "base64",
    ).toString("utf8");
    const order = [...decoded.matchAll(/week: (\d{4}-\d{2}-\d{2})/g)].map(
      (m) => m[1],
    );
    expect(order).toEqual(["2026-04-13", "2026-04-20"]);
    expect(decoded).toContain("skip_reason: tired");
  });

  it("replaces, not duplicates, when re-posting the same week", async () => {
    let putBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "PUT") {
        putBody = JSON.parse(init?.body as string);
        return jsonResponse({ ok: true }, 200);
      }
      return jsonResponse({
        type: "file",
        content: b64(SAMPLE_FILE),
        encoding: "base64",
        sha: "existing-sha",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await upsertWeekEntry({
      week: "2026-04-13",
      cooked: ["new-meal"],
      skipped: [],
    });

    const decoded = Buffer.from(
      putBody?.content as string,
      "base64",
    ).toString("utf8");
    const occurrences = [...decoded.matchAll(/week: 2026-04-13/g)];
    expect(occurrences).toHaveLength(1);
    expect(decoded).toContain("cooked: [new-meal]");
    expect(decoded).not.toContain("[tacos]");
  });
});

describe("upsertWeekEntry — 409 retry", () => {
  it("retries once on 409 then succeeds (4 fetches: GET, PUT, GET, PUT)", async () => {
    const calls: string[] = [];
    let putAttempt = 0;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method as string | undefined) ?? "GET";
      calls.push(method);
      if (method === "PUT") {
        putAttempt += 1;
        if (putAttempt === 1) {
          return textResponse("conflict", 409);
        }
        return jsonResponse({ ok: true }, 200);
      }
      return jsonResponse({
        type: "file",
        content: b64(SAMPLE_FILE),
        encoding: "base64",
        sha: "sha-" + putAttempt,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await upsertWeekEntry({
      week: "2026-04-20",
      cooked: ["x"],
      skipped: [],
    });

    expect(calls).toEqual(["GET", "PUT", "GET", "PUT"]);
  });

  it("throws GitHubConflictError after two consecutive 409s", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "PUT") return textResponse("conflict", 409);
      return jsonResponse({
        type: "file",
        content: b64(SAMPLE_FILE),
        encoding: "base64",
        sha: "abc",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertWeekEntry({ week: "2026-04-20", cooked: [], skipped: [] }),
    ).rejects.toBeInstanceOf(GitHubConflictError);
  });
});

describe("upsertWeekEntry — auth errors", () => {
  it("throws GitHubAuthError on 401/403 from PUT (typically: PAT lacks write)", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "PUT") return textResponse("forbidden", 403);
      return textResponse("Not Found", 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertWeekEntry({ week: "2026-04-20", cooked: [], skipped: [] }),
    ).rejects.toBeInstanceOf(GitHubAuthError);
  });

  it("maps other 4xx/5xx PUT failures to GitHubUpstreamError", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = (init?.method as string | undefined) ?? "GET";
      if (method === "PUT") return textResponse("validation failed", 422);
      return textResponse("Not Found", 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertWeekEntry({ week: "2026-04-20", cooked: [], skipped: [] }),
    ).rejects.toBeInstanceOf(GitHubUpstreamError);
  });
});
