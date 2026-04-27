import { DEMO_PANTRY, isDemoMode } from "@/lib/demo/fixtures";
import {
  GitHubAuthError,
  GitHubUpstreamError,
  MissingEnvVarError,
  fetchPantryFromGitHub,
} from "@/lib/pantry/github";
import { PantryParseError } from "@/lib/pantry/parse";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  if (isDemoMode()) {
    return Response.json(DEMO_PANTRY, {
      headers: { "X-Demo-Mode": "1" },
    });
  }

  try {
    const pantry = await fetchPantryFromGitHub();
    return Response.json(pantry);
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
    if (err instanceof PantryParseError) {
      return Response.json(
        { error: `Failed to parse pantry: ${err.message}` },
        { status: 502 },
      );
    }
    if (err instanceof GitHubUpstreamError) {
      return Response.json(
        { error: `GitHub upstream error: ${err.message}` },
        { status: 502 },
      );
    }
    console.error("Unexpected /api/pantry error", err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
}
