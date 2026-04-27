import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchPantryMock = vi.fn();

vi.mock("@/lib/pantry/github", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pantry/github")>(
    "@/lib/pantry/github",
  );
  return {
    ...actual,
    fetchPantryFromGitHub: () => fetchPantryMock(),
  };
});

import { GET } from "./route";
import {
  GitHubAuthError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "@/lib/pantry/github";
import { PantryParseError } from "@/lib/pantry/parse";

beforeEach(() => {
  fetchPantryMock.mockReset();
  delete process.env.DEMO_MODE;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/pantry — happy paths", () => {
  it("returns the reader's Pantry on 200", async () => {
    const pantry = { staples: ["salt"], freezer: ["chicken (Costco)"] };
    fetchPantryMock.mockResolvedValue(pantry);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(pantry);
  });

  it("DEMO_MODE=1 returns DEMO_PANTRY without calling the reader", async () => {
    process.env.DEMO_MODE = "1";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    expect(fetchPantryMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(Array.isArray(body.staples)).toBe(true);
    expect(body.staples.length).toBeGreaterThan(0);
    expect(Array.isArray(body.freezer)).toBe(true);
  });
});

describe("GET /api/pantry — error paths", () => {
  it("500 on MissingEnvVarError", async () => {
    fetchPantryMock.mockRejectedValue(new MissingEnvVarError("GITHUB_PAT"));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("502 on GitHubAuthError with PAT hint", async () => {
    fetchPantryMock.mockRejectedValue(new GitHubAuthError(403));
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/GITHUB_PAT/);
  });

  it("502 on GitHubUpstreamError", async () => {
    fetchPantryMock.mockRejectedValue(new GitHubUpstreamError(500));
    const res = await GET();
    expect(res.status).toBe(502);
  });

  it("502 on PantryParseError with file context", async () => {
    fetchPantryMock.mockRejectedValue(
      new PantryParseError("pantry.md", "staples", "expected array of strings"),
    );
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/pantry\.md/);
  });
});
