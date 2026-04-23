import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "@/lib/recipes/github";
import { RecipeParseError } from "@/lib/recipes/parse";
import type { Recipe } from "@/lib/recipes/types";

vi.mock("@/lib/recipes/github", async () => {
  const actual = await vi.importActual<typeof import("@/lib/recipes/github")>(
    "@/lib/recipes/github",
  );
  return {
    ...actual,
    fetchRecipesFromGitHub: vi.fn(),
  };
});

// Import after the mock is declared so the route binds to the mocked symbol.
const { GET } = await import("./route");
const { fetchRecipesFromGitHub } = await import("@/lib/recipes/github");
const fetchRecipesMock = vi.mocked(fetchRecipesFromGitHub);

async function getBody(response: Response): Promise<unknown> {
  return await response.json();
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    title: "Tacos",
    tags: ["mexican"],
    kidVersion: null,
    content: "Body.",
    filename: "tacos.md",
  },
  {
    title: "Pasta",
    tags: ["italian"],
    kidVersion: "plain noodles",
    content: "Body.",
    filename: "pasta.md",
  },
];

describe("GET /api/recipes", () => {
  afterEach(() => {
    fetchRecipesMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns 200 with the recipe array on success", async () => {
    fetchRecipesMock.mockResolvedValueOnce(SAMPLE_RECIPES);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await getBody(response)).toEqual(SAMPLE_RECIPES);
  });

  it("returns 500 with the missing-var message when MissingEnvVarError is thrown", async () => {
    fetchRecipesMock.mockRejectedValueOnce(new MissingEnvVarError("GITHUB_PAT"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await getBody(response)).toEqual({
      error: "GITHUB_PAT environment variable is required",
    });
  });

  it("returns 502 with a GITHUB_PAT hint on GitHubAuthError", async () => {
    fetchRecipesMock.mockRejectedValueOnce(new GitHubAuthError(401));

    const response = await GET();

    expect(response.status).toBe(502);
    const body = (await getBody(response)) as { error: string };
    expect(body.error).toMatch(/GITHUB_PAT/);
  });

  it("returns 502 mentioning all three env vars on GitHubNotFoundError", async () => {
    fetchRecipesMock.mockRejectedValueOnce(new GitHubNotFoundError());

    const response = await GET();

    expect(response.status).toBe(502);
    const body = (await getBody(response)) as { error: string };
    expect(body.error).toMatch(/RECIPES_REPO/);
    expect(body.error).toMatch(/RECIPES_PATH/);
    expect(body.error).toMatch(/GITHUB_PAT/);
  });

  it("returns 502 with upstream detail on GitHubUpstreamError", async () => {
    fetchRecipesMock.mockRejectedValueOnce(new GitHubUpstreamError(500));

    const response = await GET();

    expect(response.status).toBe(502);
    const body = (await getBody(response)) as { error: string };
    expect(body.error).toMatch(/upstream/i);
  });

  it("returns 502 with the filename embedded on RecipeParseError", async () => {
    fetchRecipesMock.mockRejectedValueOnce(
      new RecipeParseError("chicken-tacos.md", "title is required"),
    );

    const response = await GET();

    expect(response.status).toBe(502);
    const body = (await getBody(response)) as { error: string };
    expect(body.error).toMatch(/chicken-tacos\.md/);
  });

  it("returns 500 with a generic message on an unexpected error (no leak of internals)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchRecipesMock.mockRejectedValueOnce(
      new TypeError("secret internal detail"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    const body = (await getBody(response)) as { error: string };
    expect(body.error).not.toMatch(/secret internal detail/);
    expect(body.error).toMatch(/unexpected/i);
  });
});
