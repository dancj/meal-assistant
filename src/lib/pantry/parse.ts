import matter from "gray-matter";
import type { Pantry } from "./types";

export class PantryParseError extends Error {
  readonly filename: string;
  readonly field: string;

  constructor(filename: string, field: string, detail: string) {
    super(`${filename}: ${field}: ${detail}`);
    this.name = "PantryParseError";
    this.filename = filename;
    this.field = field;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function readField(
  data: Record<string, unknown>,
  key: "staples" | "freezer",
  filename: string,
): string[] {
  const raw = data[key];
  if (raw === undefined || raw === null) return [];
  if (!isStringArray(raw)) {
    throw new PantryParseError(
      filename,
      key,
      "expected array of strings (or omit the key for an empty list)",
    );
  }
  return raw;
}

export function parsePantryFile(source: string, filename: string): Pantry {
  if (source.trim() === "") return { staples: [], freezer: [] };

  const parsed = matter(source);
  const data = parsed.data as Record<string, unknown>;

  return {
    staples: readField(data, "staples", filename),
    freezer: readField(data, "freezer", filename),
  };
}
