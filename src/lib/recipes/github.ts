import { parseRecipeMarkdown } from "./parse";
import type { Recipe } from "./types";

export class MissingEnvVarError extends Error {
  constructor(varName: string) {
    super(`${varName} environment variable is required`);
    this.name = "MissingEnvVarError";
  }
}

export class GitHubAuthError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub returned ${status}: authentication failed`);
    this.name = "GitHubAuthError";
    this.status = status;
  }
}

export class GitHubNotFoundError extends Error {
  constructor() {
    super("GitHub returned 404 for the configured repo or path");
    this.name = "GitHubNotFoundError";
  }
}

export class GitHubUpstreamError extends Error {
  readonly status: number;

  constructor(status: number, detail?: string) {
    const base = `GitHub upstream error (status ${status})`;
    super(detail ? `${base}: ${detail}` : base);
    this.name = "GitHubUpstreamError";
    this.status = status;
  }
}

interface ContentsDirectoryEntry {
  type: "file" | "dir" | "symlink" | "submodule";
  name: string;
  path?: string;
  url: string;
}

function requireEnv(name: "GITHUB_PAT" | "RECIPES_REPO" | "RECIPES_PATH"): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new MissingEnvVarError(name);
  }
  return value;
}

function buildAuthHeaders(pat: string, rawAccept: boolean): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: rawAccept ? "application/vnd.github.raw" : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "meal-assistant",
  };
}

function mapGitHubError(status: number, context: "listing" | "file"): Error {
  if (status === 401 || status === 403) {
    return new GitHubAuthError(status);
  }
  // Per-file 404 mid-flight is an upstream anomaly (listing promised the file);
  // only a listing-level 404 signals the configured repo/path is wrong.
  if (status === 404 && context === "listing") {
    return new GitHubNotFoundError();
  }
  return new GitHubUpstreamError(status);
}

export async function fetchRecipesFromGitHub(): Promise<Recipe[]> {
  const pat = requireEnv("GITHUB_PAT");
  const repo = requireEnv("RECIPES_REPO");
  const rawPath = requireEnv("RECIPES_PATH");
  const normalizedPath = rawPath.replace(/^\/+|\/+$/g, "");

  const listingUrl = normalizedPath
    ? `https://api.github.com/repos/${repo}/contents/${normalizedPath}`
    : `https://api.github.com/repos/${repo}/contents`;

  const listingResponse = await fetch(listingUrl, {
    headers: buildAuthHeaders(pat, false),
  });
  if (!listingResponse.ok) {
    throw mapGitHubError(listingResponse.status, "listing");
  }

  const listing = (await listingResponse.json()) as ContentsDirectoryEntry[];
  const recipeEntries = listing.filter(
    (entry) =>
      entry.type === "file" &&
      entry.name.endsWith(".md") &&
      !entry.name.startsWith("."),
  );

  const recipes = await Promise.all(
    recipeEntries.map(async (entry) => {
      const fileResponse = await fetch(entry.url, {
        headers: buildAuthHeaders(pat, true),
      });
      if (!fileResponse.ok) {
        throw mapGitHubError(fileResponse.status, "file");
      }
      const source = await fileResponse.text();
      return parseRecipeMarkdown(source, entry.name);
    }),
  );

  return recipes;
}
