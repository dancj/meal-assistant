import {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "@/lib/recipes/github";
import { InvalidLogRequestError } from "./errors";
import { parseLogFile } from "./parse";
import type { MealLog } from "./types";

const FILENAME_RX = /^(\d{4}-\d{2})\.md$/;
const MAX_WEEKS = 52;
const FILES_TO_FAN_OUT = 2;

interface ContentsDirectoryEntry {
  type: "file" | "dir" | "symlink" | "submodule";
  name: string;
  url: string;
}

function requireEnv(name: "GITHUB_PAT" | "RECIPES_REPO"): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new MissingEnvVarError(name);
  }
  return value;
}

function buildAuthHeaders(pat: string, rawAccept: boolean): HeadersInit {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: rawAccept
      ? "application/vnd.github.raw"
      : "application/vnd.github+json",
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

function mapAuth(status: number): Error | null {
  if (status === 401 || status === 403) return new GitHubAuthError(status);
  return null;
}

export async function fetchRecentLogs(weeks: number): Promise<MealLog[]> {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_WEEKS) {
    throw new InvalidLogRequestError(
      "weeks",
      `expected integer in [1, ${MAX_WEEKS}], got ${weeks}`,
    );
  }

  const pat = requireEnv("GITHUB_PAT");
  const repo = requireEnv("RECIPES_REPO");
  const listingUrl = `https://api.github.com/repos/${repo}/contents/log`;

  const listingResponse = await fetch(listingUrl, {
    headers: buildAuthHeaders(pat, false),
    cache: "no-store",
  });

  if (listingResponse.status === 404) return [];
  const authErr = mapAuth(listingResponse.status);
  if (authErr) throw authErr;
  if (!listingResponse.ok) {
    throw new GitHubUpstreamError(
      listingResponse.status,
      await readBodyDetail(listingResponse),
    );
  }

  const listing = (await listingResponse.json()) as ContentsDirectoryEntry[];
  if (!Array.isArray(listing)) {
    // GitHub returns an object (not array) when contents/log resolves to a single file;
    // that's not the directory we expected.
    throw new GitHubNotFoundError();
  }

  const files = listing
    .filter((e) => e.type === "file" && FILENAME_RX.test(e.name))
    .sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0))
    .slice(0, FILES_TO_FAN_OUT);

  const allEntries: MealLog[] = [];
  for (const file of files) {
    const fileResponse = await fetch(file.url, {
      headers: buildAuthHeaders(pat, true),
      cache: "no-store",
    });
    const fileAuthErr = mapAuth(fileResponse.status);
    if (fileAuthErr) throw fileAuthErr;
    if (!fileResponse.ok) {
      throw new GitHubUpstreamError(
        fileResponse.status,
        await readBodyDetail(fileResponse),
      );
    }
    const text = await fileResponse.text();
    const parsed = parseLogFile(text, file.name);
    allEntries.push(...parsed);
  }

  allEntries.sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : 0));
  return allEntries.slice(0, weeks);
}
