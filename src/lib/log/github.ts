import {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubUpstreamError,
  MissingEnvVarError,
} from "@/lib/recipes/github";
import { parseLogFile, serializeLogFile } from "./parse";
import type { MealLog } from "./types";

export {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubUpstreamError,
  MissingEnvVarError,
};

export class GitHubConflictError extends Error {
  constructor(detail?: string) {
    super(
      detail
        ? `GitHub returned 409 (sha conflict) after retry: ${detail}`
        : "GitHub returned 409 (sha conflict) after retry",
    );
    this.name = "GitHubConflictError";
  }
}

interface ContentsFile {
  type: "file";
  content: string;
  encoding: "base64";
  sha: string;
}

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
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "meal-assistant",
  };
}

function logPath(yearMonth: string): string {
  return `log/${yearMonth}.md`;
}

function yearMonthFromWeek(week: string): string {
  // week is YYYY-MM-DD; first 7 chars = YYYY-MM
  return week.slice(0, 7);
}

function decodeBase64(content: string): string {
  // GitHub returns base64 with newlines every 60 chars; strip them.
  const stripped = content.replace(/\n/g, "");
  return Buffer.from(stripped, "base64").toString("utf8");
}

function encodeBase64(content: string): string {
  return Buffer.from(content, "utf8").toString("base64");
}

async function readBodyDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return "";
  }
}

export async function getLogFile(
  yearMonth: string,
): Promise<{ content: string; sha: string } | null> {
  const pat = requireEnv("GITHUB_PAT");
  const repo = requireEnv("RECIPES_REPO");
  const url = `https://api.github.com/repos/${repo}/contents/${logPath(yearMonth)}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(pat),
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) {
    throw new GitHubAuthError(response.status);
  }
  if (!response.ok) {
    throw new GitHubUpstreamError(response.status, await readBodyDetail(response));
  }

  const data = (await response.json()) as ContentsFile;
  return {
    content: decodeBase64(data.content),
    sha: data.sha,
  };
}

async function putLogFile(
  yearMonth: string,
  content: string,
  sha: string | null,
  message: string,
): Promise<void> {
  const pat = requireEnv("GITHUB_PAT");
  const repo = requireEnv("RECIPES_REPO");
  const url = `https://api.github.com/repos/${repo}/contents/${logPath(yearMonth)}`;

  const body: Record<string, unknown> = {
    message,
    content: encodeBase64(content),
  };
  if (sha !== null) body.sha = sha;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...buildAuthHeaders(pat),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    throw new GitHubAuthError(response.status);
  }
  if (response.status === 409) {
    throw new GitHubConflictError(await readBodyDetail(response));
  }
  throw new GitHubUpstreamError(response.status, await readBodyDetail(response));
}

function upsertEntry(entries: MealLog[], next: MealLog): MealLog[] {
  const filtered = entries.filter((e) => e.week !== next.week);
  filtered.push(next);
  return filtered;
}

async function upsertOnce(entry: MealLog, yearMonth: string): Promise<void> {
  const existing = await getLogFile(yearMonth);
  const current = existing
    ? parseLogFile(existing.content, `${yearMonth}.md`)
    : [];
  const merged = upsertEntry(current, entry);
  const nextContent = serializeLogFile(merged);
  const message = `chore(log): ${entry.week} cooked=${entry.cooked.length} skipped=${entry.skipped.length}`;
  await putLogFile(yearMonth, nextContent, existing?.sha ?? null, message);
}

export async function upsertWeekEntry(entry: MealLog): Promise<void> {
  const yearMonth = yearMonthFromWeek(entry.week);
  try {
    await upsertOnce(entry, yearMonth);
    return;
  } catch (err) {
    if (!(err instanceof GitHubConflictError)) throw err;
  }
  // One retry from a fresh GET.
  try {
    await upsertOnce(entry, yearMonth);
  } catch (err) {
    if (err instanceof GitHubConflictError) {
      throw new GitHubConflictError("two consecutive 409s; giving up");
    }
    throw err;
  }
}
