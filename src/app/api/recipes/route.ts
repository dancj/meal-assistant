import {
  fetchRecipesFromGitHub,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "@/lib/recipes/github";
import { RecipeParseError } from "@/lib/recipes/parse";
import { DEMO_RECIPES, isDemoMode } from "@/lib/demo/fixtures";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  if (isDemoMode()) {
    return Response.json(DEMO_RECIPES, {
      headers: { "X-Demo-Mode": "1" },
    });
  }
  try {
    const recipes = await fetchRecipesFromGitHub();
    return Response.json(recipes);
  } catch (err) {
    if (err instanceof MissingEnvVarError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof GitHubAuthError) {
      return Response.json(
        { error: "GitHub auth failed (check GITHUB_PAT)" },
        { status: 502 },
      );
    }
    if (err instanceof GitHubNotFoundError) {
      return Response.json(
        {
          error:
            "Repo or path not found, or PAT lacks access — check RECIPES_REPO, RECIPES_PATH, and GITHUB_PAT scope",
        },
        { status: 502 },
      );
    }
    if (err instanceof GitHubUpstreamError) {
      return Response.json(
        { error: `GitHub upstream error: ${err.message}` },
        { status: 502 },
      );
    }
    if (err instanceof RecipeParseError) {
      return Response.json(
        { error: `Failed to parse ${err.message}` },
        { status: 502 },
      );
    }
    console.error("Unexpected /api/recipes error", err);
    return Response.json(
      { error: "Unexpected error fetching recipes" },
      { status: 500 },
    );
  }
}
