import { describe, expect, it } from "vitest";
import { LogParseError, parseLogFile, serializeLogFile } from "./parse";
import type { MealLog } from "./types";

const TWO_BLOCK_FILE = `---
week: 2026-04-13
cooked: [tacos, salmon]
skipped: []
---
---
week: 2026-04-20
cooked: [chicken-tacos]
skipped: [pasta-bake]
skip_reason: too tired, did takeout
---
`;

describe("parseLogFile", () => {
  it("parses a 2-block file in document order", () => {
    const got = parseLogFile(TWO_BLOCK_FILE, "2026-04.md");
    expect(got).toHaveLength(2);
    expect(got[0]).toEqual({
      week: "2026-04-13",
      cooked: ["tacos", "salmon"],
      skipped: [],
    });
    expect(got[1]).toEqual({
      week: "2026-04-20",
      cooked: ["chicken-tacos"],
      skipped: ["pasta-bake"],
      skipReason: "too tired, did takeout",
    });
  });

  it("returns [] for an empty file", () => {
    expect(parseLogFile("", "x.md")).toEqual([]);
    expect(parseLogFile("   \n  \n", "x.md")).toEqual([]);
  });

  it("treats empty skip_reason as omitted", () => {
    const src = `---
week: 2026-04-20
cooked: [a]
skipped: []
skip_reason: ""
---
`;
    const got = parseLogFile(src, "x.md");
    expect(got[0].skipReason).toBeUndefined();
  });

  it("parses cleanly with extra whitespace and blank lines around blocks", () => {
    const src = `

---
week: 2026-04-20
cooked: []
skipped: []
---

`;
    expect(parseLogFile(src, "x.md")).toEqual([
      { week: "2026-04-20", cooked: [], skipped: [] },
    ]);
  });

  it("throws LogParseError on missing week", () => {
    const src = `---
cooked: []
skipped: []
---
`;
    expect(() => parseLogFile(src, "bad.md")).toThrow(LogParseError);
    expect(() => parseLogFile(src, "bad.md")).toThrow(/week is required/);
  });

  it("throws LogParseError on malformed week", () => {
    const src = `---
week: 2026/04/20
cooked: []
skipped: []
---
`;
    expect(() => parseLogFile(src, "bad.md")).toThrow(/YYYY-MM-DD/);
  });

  it("throws LogParseError when cooked is not an array of strings", () => {
    const src = `---
week: 2026-04-20
cooked: hello
skipped: []
---
`;
    expect(() => parseLogFile(src, "bad.md")).toThrow(/cooked must be an array/);
  });

  it("throws LogParseError when skipped is not an array of strings", () => {
    const src = `---
week: 2026-04-20
cooked: []
skipped: [123]
---
`;
    expect(() => parseLogFile(src, "bad.md")).toThrow(/skipped must be an array/);
  });

  it("error message identifies the offending block index", () => {
    const src = `---
week: 2026-04-13
cooked: []
skipped: []
---
---
cooked: []
skipped: []
---
`;
    try {
      parseLogFile(src, "2026-04.md");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(LogParseError);
      expect((err as LogParseError).blockIndex).toBe(1);
      expect((err as LogParseError).message).toContain("2026-04.md[block 1]");
    }
  });
});

describe("serializeLogFile", () => {
  it("emits blocks sorted ascending by week regardless of input order", () => {
    const entries: MealLog[] = [
      { week: "2026-04-20", cooked: ["a"], skipped: [] },
      { week: "2026-04-06", cooked: [], skipped: [] },
      { week: "2026-04-13", cooked: [], skipped: ["b"] },
    ];
    const out = serializeLogFile(entries);
    const order = [...out.matchAll(/week: (\d{4}-\d{2}-\d{2})/g)].map(
      (m) => m[1],
    );
    expect(order).toEqual(["2026-04-06", "2026-04-13", "2026-04-20"]);
  });

  it("omits skip_reason when undefined", () => {
    const out = serializeLogFile([
      { week: "2026-04-20", cooked: [], skipped: [] },
    ]);
    expect(out).not.toContain("skip_reason");
  });

  it("includes skip_reason when present", () => {
    const out = serializeLogFile([
      {
        week: "2026-04-20",
        cooked: [],
        skipped: ["x"],
        skipReason: "kid hated it",
      },
    ]);
    expect(out).toContain("skip_reason: kid hated it");
  });

  it("returns empty string for an empty array", () => {
    expect(serializeLogFile([])).toBe("");
  });
});

describe("round-trip", () => {
  it("parse(serialize(parse(source))) deep-equals parse(source)", () => {
    const first = parseLogFile(TWO_BLOCK_FILE, "x.md");
    const reSerialized = serializeLogFile(first);
    const second = parseLogFile(reSerialized, "x.md");
    expect(second).toEqual(first);
  });

  it("preserves entries with empty cooked/skipped through a round-trip", () => {
    const entries: MealLog[] = [
      { week: "2026-04-13", cooked: [], skipped: [] },
      { week: "2026-04-20", cooked: ["a"], skipped: ["b"] },
    ];
    const out = serializeLogFile(entries);
    expect(parseLogFile(out, "x.md")).toEqual(entries);
  });
});
