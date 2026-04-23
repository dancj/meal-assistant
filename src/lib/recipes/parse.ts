import matter from "gray-matter";
import type { Recipe } from "./types";

export class RecipeParseError extends Error {
  readonly filename: string;

  constructor(filename: string, detail: string) {
    super(`${filename}: ${detail}`);
    this.name = "RecipeParseError";
    this.filename = filename;
  }
}

export function parseRecipeMarkdown(source: string, filename: string): Recipe {
  const parsed = matter(source);
  const data = parsed.data as Record<string, unknown>;

  const title = data.title;
  if (typeof title !== "string" || title.trim() === "") {
    throw new RecipeParseError(
      filename,
      "title frontmatter is required and must be a non-empty string",
    );
  }

  let tags: string[];
  if (data.tags === undefined || data.tags === null) {
    tags = [];
  } else if (!Array.isArray(data.tags)) {
    throw new RecipeParseError(
      filename,
      "tags frontmatter must be an array of strings when present",
    );
  } else if (!data.tags.every((t) => typeof t === "string")) {
    throw new RecipeParseError(
      filename,
      "tags frontmatter must contain only strings",
    );
  } else {
    tags = data.tags;
  }

  let kidVersion: string | null;
  const rawKidVersion = data.kid_version;
  if (rawKidVersion === undefined || rawKidVersion === null) {
    kidVersion = null;
  } else if (typeof rawKidVersion === "string") {
    if (rawKidVersion === "") {
      throw new RecipeParseError(
        filename,
        "kid_version, when present, must be a non-empty string (omit the key to mean 'none')",
      );
    }
    kidVersion = rawKidVersion;
  } else {
    throw new RecipeParseError(
      filename,
      "kid_version frontmatter must be a string when present",
    );
  }

  return {
    title,
    tags,
    kidVersion,
    content: parsed.content.replace(/^\s+/, ""),
    filename,
  };
}
