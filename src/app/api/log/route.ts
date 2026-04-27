import { DEMO_LOGS, isDemoMode } from "@/lib/demo/fixtures";
import { InvalidLogRequestError } from "@/lib/log/errors";
import {
  GitHubAuthError,
  GitHubConflictError,
  GitHubUpstreamError,
  MissingEnvVarError,
  upsertWeekEntry,
} from "@/lib/log/github";
import { LogParseError } from "@/lib/log/parse";
import { fetchRecentLogs } from "@/lib/log/recent";
import type { MealLog } from "@/lib/log/types";

export const runtime = "nodejs";

const WEEK_RX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_WEEKS = 8;
const MAX_WEEKS = 52;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function validateBody(body: unknown): MealLog {
  if (!isPlainObject(body)) {
    throw new InvalidLogRequestError("<root>", "expected JSON object");
  }
  const week = body.week;
  if (typeof week !== "string" || !WEEK_RX.test(week)) {
    throw new InvalidLogRequestError(
      "week",
      "expected YYYY-MM-DD string",
    );
  }
  if (!isStringArray(body.cooked)) {
    throw new InvalidLogRequestError("cooked", "expected array of strings");
  }
  const cooked: string[] = body.cooked;
  if (cooked.some((c) => c === "")) {
    throw new InvalidLogRequestError("cooked", "entries must be non-empty strings");
  }
  if (!isStringArray(body.skipped)) {
    throw new InvalidLogRequestError("skipped", "expected array of strings");
  }
  const skipped: string[] = body.skipped;
  if (skipped.some((s) => s === "")) {
    throw new InvalidLogRequestError("skipped", "entries must be non-empty strings");
  }
  const intersection = cooked.filter((c) => skipped.includes(c));
  if (intersection.length > 0) {
    throw new InvalidLogRequestError(
      "cooked",
      `entries cannot also appear in skipped: ${intersection.join(", ")}`,
    );
  }
  let skipReason: string | undefined;
  if (body.skipReason !== undefined) {
    if (typeof body.skipReason !== "string") {
      throw new InvalidLogRequestError(
        "skipReason",
        "expected string when present",
      );
    }
    if (body.skipReason !== "") skipReason = body.skipReason;
  }

  const log: MealLog = {
    week,
    cooked,
    skipped,
  };
  if (skipReason !== undefined) log.skipReason = skipReason;
  return log;
}

function mapPostError(err: unknown): Response {
  if (err instanceof InvalidLogRequestError) {
    return Response.json({ error: err.message, field: err.field }, { status: 400 });
  }
  if (err instanceof MissingEnvVarError) {
    return Response.json({ error: err.message }, { status: 500 });
  }
  if (err instanceof GitHubAuthError) {
    return Response.json(
      {
        error:
          "GitHub auth failed (check GITHUB_PAT — Contents: Write scope is required for /api/log)",
      },
      { status: 502 },
    );
  }
  if (err instanceof GitHubConflictError) {
    return Response.json(
      { error: "GitHub returned 409 (sha conflict) after retry" },
      { status: 502 },
    );
  }
  if (err instanceof GitHubUpstreamError) {
    return Response.json(
      { error: `GitHub upstream error: ${err.message}` },
      { status: 502 },
    );
  }
  console.error("Unexpected /api/log POST error", err);
  return Response.json({ error: "Unexpected error" }, { status: 500 });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  let entry: MealLog;
  try {
    entry = validateBody(body);
  } catch (err) {
    return mapPostError(err);
  }

  if (isDemoMode()) {
    return Response.json({ ok: true }, { headers: { "X-Demo-Mode": "1" } });
  }

  try {
    await upsertWeekEntry(entry);
    return Response.json({ ok: true });
  } catch (err) {
    return mapPostError(err);
  }
}

function parseWeeksParam(raw: string | null): number {
  if (raw === null || raw === "") return DEFAULT_WEEKS;
  if (!/^\d+$/.test(raw)) {
    throw new InvalidLogRequestError(
      "weeks",
      "expected positive integer",
    );
  }
  const n = Number.parseInt(raw, 10);
  if (n < 1 || n > MAX_WEEKS) {
    throw new InvalidLogRequestError(
      "weeks",
      `expected integer in [1, ${MAX_WEEKS}], got ${n}`,
    );
  }
  return n;
}

function mapGetError(err: unknown): Response {
  if (err instanceof InvalidLogRequestError) {
    return Response.json({ error: err.message, field: err.field }, { status: 400 });
  }
  if (err instanceof MissingEnvVarError) {
    return Response.json({ error: err.message }, { status: 500 });
  }
  if (err instanceof GitHubAuthError) {
    return Response.json(
      { error: "GitHub auth failed (check GITHUB_PAT)" },
      { status: 502 },
    );
  }
  if (err instanceof LogParseError) {
    return Response.json(
      { error: `Failed to parse log file: ${err.message}` },
      { status: 502 },
    );
  }
  if (err instanceof GitHubUpstreamError) {
    return Response.json(
      { error: `GitHub upstream error: ${err.message}` },
      { status: 502 },
    );
  }
  console.error("Unexpected /api/log GET error", err);
  return Response.json({ error: "Unexpected error" }, { status: 500 });
}

export async function GET(request: Request): Promise<Response> {
  let weeks: number;
  try {
    const url = new URL(request.url);
    weeks = parseWeeksParam(url.searchParams.get("weeks"));
  } catch (err) {
    return mapGetError(err);
  }

  if (isDemoMode()) {
    return Response.json(DEMO_LOGS.slice(0, weeks), {
      headers: { "X-Demo-Mode": "1" },
    });
  }

  try {
    const logs = await fetchRecentLogs(weeks);
    return Response.json(logs);
  } catch (err) {
    return mapGetError(err);
  }
}
