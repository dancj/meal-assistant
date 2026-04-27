import { describe, expect, it } from "vitest";
import { PantryParseError, parsePantryFile } from "./parse";

const ISSUE_EXAMPLE = `---
staples:
  - olive oil
  - salt
  - pepper
  - garlic
  - onions
  - rice
  - pasta
  - canned tomatoes
freezer:
  - chicken thighs (Costco, bought 2026-04-15)
  - ground beef (Costco, bought 2026-04-10)
---
`;

describe("parsePantryFile — happy paths", () => {
  it("parses the issue example into the right shape", () => {
    const got = parsePantryFile(ISSUE_EXAMPLE, "pantry.md");
    expect(got.staples).toEqual([
      "olive oil",
      "salt",
      "pepper",
      "garlic",
      "onions",
      "rice",
      "pasta",
      "canned tomatoes",
    ]);
    expect(got.freezer).toEqual([
      "chicken thighs (Costco, bought 2026-04-15)",
      "ground beef (Costco, bought 2026-04-10)",
    ]);
  });

  it("returns empty arrays when source is empty", () => {
    expect(parsePantryFile("", "pantry.md")).toEqual({ staples: [], freezer: [] });
  });

  it("treats whitespace-only source as empty", () => {
    expect(parsePantryFile("   \n\n  \n", "pantry.md")).toEqual({
      staples: [],
      freezer: [],
    });
  });

  it("treats missing `freezer` key as empty array", () => {
    const src = `---
staples:
  - salt
  - pepper
---
`;
    expect(parsePantryFile(src, "pantry.md")).toEqual({
      staples: ["salt", "pepper"],
      freezer: [],
    });
  });

  it("treats missing `staples` key as empty array", () => {
    const src = `---
freezer:
  - chicken thighs (Costco)
---
`;
    expect(parsePantryFile(src, "pantry.md")).toEqual({
      staples: [],
      freezer: ["chicken thighs (Costco)"],
    });
  });

  it("preserves freezer freetext metadata verbatim (date suffix in parens)", () => {
    const src = `---
staples: []
freezer:
  - ground beef (Costco, bought 2026-04-10)
---
`;
    const got = parsePantryFile(src, "pantry.md");
    expect(got.freezer[0]).toBe("ground beef (Costco, bought 2026-04-10)");
  });

  it("accepts explicit empty arrays via flow style", () => {
    const src = `---
staples: []
freezer: []
---
`;
    expect(parsePantryFile(src, "pantry.md")).toEqual({
      staples: [],
      freezer: [],
    });
  });

  it("preserves document order within each list", () => {
    const src = `---
staples:
  - z
  - a
  - m
---
`;
    expect(parsePantryFile(src, "pantry.md").staples).toEqual(["z", "a", "m"]);
  });
});

describe("parsePantryFile — error paths", () => {
  it("throws PantryParseError when staples is a scalar string", () => {
    const src = `---
staples: salt
---
`;
    expect(() => parsePantryFile(src, "pantry.md")).toThrow(PantryParseError);
    expect(() => parsePantryFile(src, "pantry.md")).toThrow(/staples/);
  });

  it("throws PantryParseError when staples contains a non-string entry", () => {
    const src = `---
staples:
  - salt
  - 42
---
`;
    expect(() => parsePantryFile(src, "pantry.md")).toThrow(/staples/);
  });

  it("throws PantryParseError when freezer is a number", () => {
    const src = `---
freezer: 12
---
`;
    expect(() => parsePantryFile(src, "pantry.md")).toThrow(/freezer/);
  });

  it("error message names the file for context", () => {
    const src = `---
staples: 1
---
`;
    try {
      parsePantryFile(src, "pantry.md");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PantryParseError);
      expect((err as PantryParseError).filename).toBe("pantry.md");
    }
  });
});
