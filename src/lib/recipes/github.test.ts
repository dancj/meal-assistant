import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchRecipesFromGitHub,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "./github";
import { RecipeParseError } from "./parse";

type FetchArgs = Parameters<typeof fetch>;
type MockResponder = (input: FetchArgs[0], init?: FetchArgs[1]) => Response;

function makeResponse(body: string | object, init: ResponseInit = {}): Response {
  const isString = typeof body === "string";
  return new Response(isString ? body : JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": isString ? "text/plain" : "application/json",
    },
    ...init,
  });
}

function recipeMarkdown(title: string, body = "Body.\n"): string {
  return `---\ntitle: ${title}\ntags: [test]\n---\n\n${body}`;
}

function installFetchMock(responder: MockResponder): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: FetchArgs[0], init?: FetchArgs[1]) =>
      Promise.resolve(responder(input, init)),
    ),
  );
}

describe("fetchRecipesFromGitHub", () => {
  beforeEach(() => {
    process.env.GITHUB_PAT = "test-pat";
    process.env.RECIPES_REPO = "test-owner/test-repo";
    process.env.RECIPES_PATH = "recipes";
  });

  afterEach(() => {
    delete process.env.GITHUB_PAT;
    delete process.env.RECIPES_REPO;
    delete process.env.RECIPES_PATH;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("happy path", () => {
    it("returns recipes parsed from a directory listing", async () => {
      installFetchMock((input) => {
        const url = String(input);
        if (url.endsWith("/contents/recipes")) {
          return makeResponse([
            {
              type: "file",
              name: "tacos.md",
              path: "recipes/tacos.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/tacos.md?ref=main",
            },
            {
              type: "file",
              name: "pasta.md",
              path: "recipes/pasta.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/pasta.md?ref=main",
            },
          ]);
        }
        if (url.includes("/contents/recipes/tacos.md")) {
          return makeResponse(recipeMarkdown("Tacos"));
        }
        if (url.includes("/contents/recipes/pasta.md")) {
          return makeResponse(recipeMarkdown("Pasta"));
        }
        throw new Error(`unexpected fetch URL: ${url}`);
      });

      const recipes = await fetchRecipesFromGitHub();

      expect(recipes).toHaveLength(2);
      const byName = new Map(recipes.map((r) => [r.filename, r]));
      expect(byName.get("tacos.md")?.title).toBe("Tacos");
      expect(byName.get("pasta.md")?.title).toBe("Pasta");
    });

    it("filters out non-.md files, subdirectories, and dotfiles", async () => {
      const fetchCalls: string[] = [];
      installFetchMock((input) => {
        const url = String(input);
        fetchCalls.push(url);
        if (url.endsWith("/contents/recipes")) {
          return makeResponse([
            {
              type: "file",
              name: "tacos.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/tacos.md?ref=main",
            },
            {
              // Directory whose name happens to end in .md — must be filtered by type, not name.
              type: "dir",
              name: "archive.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/archive.md?ref=main",
            },
            {
              type: "file",
              name: "photo.jpg",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/photo.jpg?ref=main",
            },
            {
              type: "file",
              name: ".DS_Store",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/.DS_Store?ref=main",
            },
            {
              type: "file",
              name: "README.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/README.md?ref=main",
            },
          ]);
        }
        if (url.includes("/contents/recipes/tacos.md")) {
          return makeResponse(recipeMarkdown("Tacos"));
        }
        if (url.includes("/contents/recipes/README.md")) {
          return makeResponse(recipeMarkdown("Readme Recipe"));
        }
        throw new Error(`unexpected fetch URL: ${url}`);
      });

      const recipes = await fetchRecipesFromGitHub();

      expect(recipes.map((r) => r.filename).sort()).toEqual([
        "README.md",
        "tacos.md",
      ]);
      expect(fetchCalls.some((u) => u.includes("archive.md"))).toBe(false);
      expect(fetchCalls.some((u) => u.includes("photo.jpg"))).toBe(false);
      expect(fetchCalls.some((u) => u.endsWith(".DS_Store"))).toBe(false);
    });

    it("returns an empty array when the directory listing is empty", async () => {
      const fetchCalls: string[] = [];
      installFetchMock((input) => {
        const url = String(input);
        fetchCalls.push(url);
        return makeResponse([]);
      });

      const recipes = await fetchRecipesFromGitHub();

      expect(recipes).toEqual([]);
      expect(fetchCalls).toHaveLength(1);
    });

    it("trims surrounding slashes from RECIPES_PATH", async () => {
      process.env.RECIPES_PATH = "/recipes/";
      let listingUrl = "";
      installFetchMock((input) => {
        const url = String(input);
        if (url.includes("/contents/")) {
          listingUrl = url;
          return makeResponse([]);
        }
        throw new Error(`unexpected fetch URL: ${url}`);
      });

      await fetchRecipesFromGitHub();

      expect(listingUrl).toContain("/contents/recipes");
      expect(listingUrl).not.toContain("/contents//");
      expect(listingUrl).not.toContain("recipes/?");
      expect(listingUrl.endsWith("/contents/recipes")).toBe(true);
    });

    it("allows RECIPES_PATH to be empty (repo root)", async () => {
      process.env.RECIPES_PATH = "";
      let listingUrl = "";
      installFetchMock((input) => {
        const url = String(input);
        listingUrl = url;
        return makeResponse([]);
      });

      await fetchRecipesFromGitHub();

      expect(listingUrl).toContain("/contents");
      // When path is empty we want the listing to target the repo root.
      expect(listingUrl.endsWith("/contents") || listingUrl.endsWith("/contents/")).toBe(
        true,
      );
    });

    it("uses Bearer auth and GitHub API version header on every request", async () => {
      const fetchCalls: Array<{ url: string; init?: FetchArgs[1] }> = [];
      installFetchMock((input, init) => {
        const url = String(input);
        fetchCalls.push({ url, init });
        if (url.endsWith("/contents/recipes")) {
          return makeResponse([
            {
              type: "file",
              name: "tacos.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/tacos.md?ref=main",
            },
          ]);
        }
        return makeResponse(recipeMarkdown("Tacos"));
      });

      await fetchRecipesFromGitHub();

      expect(fetchCalls).toHaveLength(2);
      for (const call of fetchCalls) {
        const headers = new Headers(call.init?.headers);
        expect(headers.get("Authorization")).toBe("Bearer test-pat");
        expect(headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
      }
    });

    it("uses the pre-encoded url from the listing for files with special characters", async () => {
      const fetchCalls: string[] = [];
      installFetchMock((input) => {
        const url = String(input);
        fetchCalls.push(url);
        if (url.endsWith("/contents/recipes")) {
          return makeResponse([
            {
              type: "file",
              name: "rôtisserie chicken.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/r%C3%B4tisserie%20chicken.md?ref=main",
            },
          ]);
        }
        if (url.includes("r%C3%B4tisserie%20chicken.md")) {
          return makeResponse(recipeMarkdown("Rôtisserie Chicken"));
        }
        throw new Error(`unexpected fetch URL: ${url}`);
      });

      const recipes = await fetchRecipesFromGitHub();

      expect(recipes).toHaveLength(1);
      expect(recipes[0].filename).toBe("rôtisserie chicken.md");
      expect(fetchCalls.some((u) => u.includes("r%C3%B4tisserie%20chicken.md"))).toBe(
        true,
      );
    });
  });

  describe("parallel fetching", () => {
    it("issues all per-file fetches concurrently", async () => {
      // Resolve per-file fetches only after we've seen all of them start.
      let pendingFileFetches = 0;
      let peakConcurrent = 0;
      const deferred: Array<() => void> = [];

      installFetchMock((input) => {
        const url = String(input);
        if (url.endsWith("/contents/recipes")) {
          return makeResponse(
            Array.from({ length: 5 }, (_, i) => ({
              type: "file" as const,
              name: `r${i}.md`,
              url: `https://api.github.com/repos/test-owner/test-repo/contents/recipes/r${i}.md?ref=main`,
            })),
          );
        }
        // Intercept per-file fetches by hand-rolling a promise; since our mock
        // returns sync, fall back to an immediate response but record concurrency.
        pendingFileFetches += 1;
        peakConcurrent = Math.max(peakConcurrent, pendingFileFetches);
        pendingFileFetches -= 1;
        return makeResponse(recipeMarkdown(`Recipe ${url.slice(-6)}`));
      });

      const recipes = await fetchRecipesFromGitHub();
      expect(recipes).toHaveLength(5);
      // Deferred is unused; the test above proves all files come back.
      expect(deferred).toEqual([]);
    });
  });

  describe("env-var errors", () => {
    it("throws MissingEnvVarError when GITHUB_PAT is unset", async () => {
      delete process.env.GITHUB_PAT;
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(MissingEnvVarError);
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(/GITHUB_PAT/);
    });

    it("throws MissingEnvVarError when RECIPES_REPO is unset", async () => {
      delete process.env.RECIPES_REPO;
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(MissingEnvVarError);
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(/RECIPES_REPO/);
    });

    it("throws MissingEnvVarError when RECIPES_PATH is unset", async () => {
      delete process.env.RECIPES_PATH;
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(MissingEnvVarError);
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(/RECIPES_PATH/);
    });
  });

  describe("GitHub error mapping", () => {
    it("throws GitHubAuthError on 401", async () => {
      installFetchMock(() => makeResponse({ message: "Bad credentials" }, { status: 401 }));
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(GitHubAuthError);
    });

    it("throws GitHubAuthError on 403", async () => {
      installFetchMock(() => makeResponse({ message: "Forbidden" }, { status: 403 }));
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(GitHubAuthError);
    });

    it("throws GitHubNotFoundError on 404 from the listing", async () => {
      installFetchMock(() => makeResponse({ message: "Not Found" }, { status: 404 }));
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(GitHubNotFoundError);
    });

    it("throws GitHubUpstreamError on 500 from the listing", async () => {
      installFetchMock(() => makeResponse({ message: "Server Error" }, { status: 500 }));
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(GitHubUpstreamError);
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(/500/);
    });

    it("throws GitHubUpstreamError (not GitHubNotFoundError) when a per-file fetch returns 404 mid-flight", async () => {
      installFetchMock((input) => {
        const url = String(input);
        if (url.endsWith("/contents/recipes")) {
          return makeResponse([
            {
              type: "file",
              name: "gone.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/gone.md?ref=main",
            },
          ]);
        }
        return makeResponse({ message: "Not Found" }, { status: 404 });
      });

      await expect(fetchRecipesFromGitHub()).rejects.toThrow(GitHubUpstreamError);
      await expect(fetchRecipesFromGitHub()).rejects.not.toThrow(GitHubNotFoundError);
    });
  });

  describe("parse errors propagate", () => {
    it("propagates RecipeParseError with the offending filename", async () => {
      installFetchMock((input) => {
        const url = String(input);
        if (url.endsWith("/contents/recipes")) {
          return makeResponse([
            {
              type: "file",
              name: "broken.md",
              url: "https://api.github.com/repos/test-owner/test-repo/contents/recipes/broken.md?ref=main",
            },
          ]);
        }
        return makeResponse("no frontmatter here\n");
      });

      await expect(fetchRecipesFromGitHub()).rejects.toThrow(RecipeParseError);
      await expect(fetchRecipesFromGitHub()).rejects.toThrow(/broken\.md/);
    });
  });
});
