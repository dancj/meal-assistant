import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GitHubAuthError,
  GitHubUpstreamError,
  MissingEnvVarError,
  fetchPantryFromGitHub,
} from "./github";
import { PantryParseError } from "./parse";

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
  vi.unstubAllGlobals();
});

const SAMPLE = `---
staples:
  - salt
  - pepper
freezer:
  - chicken thighs (Costco, bought 2026-04-15)
---
`;

function rawResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

describe("fetchPantryFromGitHub — happy paths", () => {
  it("returns parsed Pantry on 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => rawResponse(SAMPLE)));
    const got = await fetchPantryFromGitHub();
    expect(got.staples).toEqual(["salt", "pepper"]);
    expect(got.freezer).toEqual(["chicken thighs (Costco, bought 2026-04-15)"]);
  });

  it("returns empty pantry on 404 (file does not exist)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => rawResponse("Not Found", 404)));
    expect(await fetchPantryFromGitHub()).toEqual({ staples: [], freezer: [] });
  });

  it("returns empty pantry when 200 body is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => rawResponse("")));
    expect(await fetchPantryFromGitHub()).toEqual({ staples: [], freezer: [] });
  });

  it("targets the contents API at log/pantry.md sibling location", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return rawResponse(SAMPLE);
      }),
    );
    await fetchPantryFromGitHub();
    expect(capturedUrl).toBe(
      "https://api.github.com/repos/owner/repo/contents/pantry.md",
    );
  });

  it("requests raw content via Accept header", async () => {
    let capturedInit: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedInit = init;
        return rawResponse(SAMPLE);
      }),
    );
    await fetchPantryFromGitHub();
    const headers = capturedInit?.headers as Record<string, string> | undefined;
    expect(headers?.Accept).toBe("application/vnd.github.raw");
    expect(headers?.Authorization).toBe("Bearer ghp_test_secret_value");
  });
});

describe("fetchPantryFromGitHub — error paths", () => {
  it("throws MissingEnvVarError when GITHUB_PAT is unset", async () => {
    delete process.env.GITHUB_PAT;
    await expect(fetchPantryFromGitHub()).rejects.toBeInstanceOf(
      MissingEnvVarError,
    );
  });

  it("throws MissingEnvVarError when RECIPES_REPO is unset", async () => {
    delete process.env.RECIPES_REPO;
    await expect(fetchPantryFromGitHub()).rejects.toBeInstanceOf(
      MissingEnvVarError,
    );
  });

  it("throws GitHubAuthError on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => rawResponse("unauthorized", 401)),
    );
    await expect(fetchPantryFromGitHub()).rejects.toBeInstanceOf(
      GitHubAuthError,
    );
  });

  it("throws GitHubAuthError on 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => rawResponse("forbidden", 403)),
    );
    await expect(fetchPantryFromGitHub()).rejects.toBeInstanceOf(
      GitHubAuthError,
    );
  });

  it("throws GitHubUpstreamError on 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => rawResponse("server explosion", 500)),
    );
    await expect(fetchPantryFromGitHub()).rejects.toBeInstanceOf(
      GitHubUpstreamError,
    );
  });

  it("propagates PantryParseError from malformed content", async () => {
    const badYaml = `---
staples: not-an-array
---
`;
    vi.stubGlobal("fetch", vi.fn(async () => rawResponse(badYaml)));
    await expect(fetchPantryFromGitHub()).rejects.toBeInstanceOf(
      PantryParseError,
    );
  });

  it("never interpolates GITHUB_PAT into upstream error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => rawResponse("server boom", 500)),
    );
    try {
      await fetchPantryFromGitHub();
      throw new Error("expected throw");
    } catch (err) {
      expect((err as Error).message).not.toContain("ghp_test_secret_value");
    }
  });
});
