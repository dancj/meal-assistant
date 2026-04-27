import matter from "gray-matter";
import type { MealLog } from "./types";

export class LogParseError extends Error {
  readonly filename: string;
  readonly blockIndex: number;

  constructor(filename: string, blockIndex: number, detail: string) {
    super(`${filename}[block ${blockIndex}]: ${detail}`);
    this.name = "LogParseError";
    this.filename = filename;
    this.blockIndex = blockIndex;
  }
}

const WEEK_RX = /^\d{4}-\d{2}-\d{2}$/;
// Inter-block separator: closing `---` of one block + opening `---` of the next.
const SEPARATOR_RX = /\r?\n---\s*\r?\n---\s*\r?\n/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function parseBlock(rawBlock: string, filename: string, index: number): MealLog {
  // gray-matter expects an opening `---` to recognise frontmatter; wrap the
  // bare block back into the document form it parses natively.
  const wrapped = `---\n${rawBlock.trim()}\n---\n`;
  const parsed = matter(wrapped);
  const data = parsed.data as Record<string, unknown>;

  // YAML 1.1 auto-parses bare YYYY-MM-DD as a Date; coerce back to a string.
  let week: string;
  const rawWeek = data.week;
  if (rawWeek instanceof Date && !Number.isNaN(rawWeek.getTime())) {
    week = rawWeek.toISOString().slice(0, 10);
  } else if (typeof rawWeek === "string") {
    week = rawWeek;
  } else {
    throw new LogParseError(
      filename,
      index,
      "week is required and must match YYYY-MM-DD",
    );
  }
  if (!WEEK_RX.test(week)) {
    throw new LogParseError(
      filename,
      index,
      "week is required and must match YYYY-MM-DD",
    );
  }

  const cookedRaw = data.cooked ?? [];
  if (!isStringArray(cookedRaw)) {
    throw new LogParseError(filename, index, "cooked must be an array of strings");
  }

  const skippedRaw = data.skipped ?? [];
  if (!isStringArray(skippedRaw)) {
    throw new LogParseError(filename, index, "skipped must be an array of strings");
  }

  let skipReason: string | undefined;
  const rawReason = data.skip_reason;
  if (rawReason === undefined || rawReason === null || rawReason === "") {
    skipReason = undefined;
  } else if (typeof rawReason === "string") {
    skipReason = rawReason;
  } else {
    throw new LogParseError(
      filename,
      index,
      "skip_reason must be a string when present",
    );
  }

  const log: MealLog = {
    week,
    cooked: cookedRaw,
    skipped: skippedRaw,
  };
  if (skipReason !== undefined) log.skipReason = skipReason;
  return log;
}

export function parseLogFile(source: string, filename: string): MealLog[] {
  const trimmed = source.trim();
  if (trimmed === "") return [];

  // Strip the leading "---" of the first doc, then split on inter-doc separators.
  const stripped = trimmed.startsWith("---")
    ? trimmed.replace(/^---\s*\r?\n/, "")
    : trimmed;
  // Drop a trailing closing "---" so we don't get an empty tail block.
  const withoutTrailing = stripped.replace(/\r?\n---\s*$/, "");

  const chunks = withoutTrailing.split(SEPARATOR_RX);
  const blocks = chunks
    .map((c) => c.trim())
    .filter((c) => c !== "");

  return blocks.map((block, i) => parseBlock(block, filename, i));
}

function formatYamlValue(value: unknown): string {
  // Inline-array form keeps the file looking like the issue's example.
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map((v) => String(v)).join(", ")}]`;
  }
  return String(value);
}

function serializeBlock(log: MealLog): string {
  const lines = [
    `week: ${log.week}`,
    `cooked: ${formatYamlValue(log.cooked)}`,
    `skipped: ${formatYamlValue(log.skipped)}`,
  ];
  if (log.skipReason !== undefined && log.skipReason !== "") {
    lines.push(`skip_reason: ${log.skipReason}`);
  }
  return ["---", ...lines, "---"].join("\n");
}

export function serializeLogFile(entries: MealLog[]): string {
  if (entries.length === 0) return "";
  const sorted = [...entries].sort((a, b) =>
    a.week < b.week ? -1 : a.week > b.week ? 1 : 0,
  );
  return sorted.map(serializeBlock).join("\n") + "\n";
}
