import {
  GitHubAuthError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "@/lib/recipes/github";
import { parsePantryFile } from "./parse";
import type { Pantry } from "./types";

export { GitHubAuthError, GitHubUpstreamError, MissingEnvVarError };

const PANTRY_FILENAME = "pantry.md";

function requireEnv(name: "GITHUB_PAT" | "RECIPES_REPO"): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new MissingEnvVarError(name);
  }
  return value;
}

function buildAuthHeaders(pat: string): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github.raw",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "meal-assistant",
  };
}

async function readBodyDetail(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 200);
  } catch {
    return "";
  }
}

export async function fetchPantryFromGitHub(): Promise<Pantry> {
  const pat = requireEnv("GITHUB_PAT");
  const repo = requireEnv("RECIPES_REPO");
  const url = `https://api.github.com/repos/${repo}/contents/${PANTRY_FILENAME}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(pat),
    cache: "no-store",
  });

  if (response.status === 404) return { staples: [], freezer: [] };
  if (response.status === 401 || response.status === 403) {
    throw new GitHubAuthError(response.status);
  }
  if (!response.ok) {
    throw new GitHubUpstreamError(response.status, await readBodyDetail(response));
  }

  const source = await response.text();
  return parsePantryFile(source, PANTRY_FILENAME);
}
