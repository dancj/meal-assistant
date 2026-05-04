import { describe, expect, it } from "vitest";

import type { MealLog } from "@/lib/log/types";
import type { Recipe } from "@/lib/recipes/types";

import { extractProtein, lastMadeDays } from "./synthesize";

const recipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  title: "Test recipe",
  tags: [],
  kidVersion: null,
  content: "",
  filename: "test.md",
  ...overrides,
});

const isoDate = (s: string) => new Date(`${s}T12:00:00Z`);

describe("extractProtein", () => {
  it("returns the canonical label when a tag matches a protein keyword", () => {
    expect(
      extractProtein(recipe({ title: "Salmon with rice", tags: ["dinner", "fish"] })),
    ).toBe("fish");
  });

  it("returns the canonical label when tags include vegetarian", () => {
    expect(
      extractProtein(recipe({ title: "Black bean tacos", tags: ["dinner", "vegetarian"] })),
    ).toBe("vegetarian");
  });

  it("falls back to title keywords when tags do not match", () => {
    expect(
      extractProtein(
        recipe({
          title: "Sheet-pan chicken thighs",
          tags: ["dinner", "weeknight", "kid-friendly"],
        }),
      ),
    ).toBe("chicken");
  });

  it("maps title species to canonical labels (salmon → fish)", () => {
    expect(
      extractProtein(recipe({ title: "Pan-seared salmon", tags: ["dinner"] })),
    ).toBe("fish");
  });

  it("maps title species to canonical labels (cod → fish)", () => {
    expect(extractProtein(recipe({ title: "Baked cod", tags: [] }))).toBe("fish");
  });

  it("maps title species to canonical labels (tofu → vegetarian)", () => {
    expect(extractProtein(recipe({ title: "Crispy tofu bowl", tags: [] }))).toBe(
      "vegetarian",
    );
  });

  it("maps title species to canonical labels (black bean → vegetarian)", () => {
    expect(extractProtein(recipe({ title: "Black bean burrito", tags: [] }))).toBe(
      "vegetarian",
    );
  });

  it("returns null when neither tag nor title hits a protein keyword", () => {
    expect(
      extractProtein(
        recipe({ title: "One-pan veggie skillet", tags: ["dinner", "one-pan"] }),
      ),
    ).toBeNull();
  });

  it("matches tags case-insensitively", () => {
    expect(extractProtein(recipe({ title: "X", tags: ["FISH"] }))).toBe("fish");
  });
});

describe("lastMadeDays", () => {
  const weekStart = isoDate("2026-05-04");

  const log = (week: string, ...cooked: string[]): MealLog => ({
    week,
    cooked,
    skipped: [],
  });

  it("returns null when no log entry mentions the recipe", () => {
    const r = recipe({ title: "Spaghetti meat sauce" });
    const logs = [log("2026-04-20", "Salmon")];
    expect(lastMadeDays(r, logs, weekStart)).toBeNull();
  });

  it("returns elapsed days for a matching log entry", () => {
    const r = recipe({ title: "Spaghetti meat sauce" });
    const logs = [log("2026-04-20", "Spaghetti meat sauce")];
    expect(lastMadeDays(r, logs, weekStart)).toBe(14);
  });

  it("prefers the newest matching log when multiple are present", () => {
    const r = recipe({ title: "Tacos" });
    const logs = [log("2026-04-13", "Tacos"), log("2026-04-20", "Tacos")];
    expect(lastMadeDays(r, logs, weekStart)).toBe(14);
  });

  it("matches case-insensitively", () => {
    const r = recipe({ title: "Black bean tacos" });
    const logs = [log("2026-04-27", "BLACK BEAN TACOS")];
    expect(lastMadeDays(r, logs, weekStart)).toBe(7);
  });

  it("ignores logs with malformed week strings without throwing", () => {
    const r = recipe({ title: "Tacos" });
    const logs: MealLog[] = [
      { week: "not-a-date", cooked: ["Tacos"], skipped: [] },
      log("2026-04-20", "Tacos"),
    ];
    expect(lastMadeDays(r, logs, weekStart)).toBe(14);
  });

  it("returns null when only matching logs have malformed week strings", () => {
    const r = recipe({ title: "Tacos" });
    const logs: MealLog[] = [
      { week: "garbage", cooked: ["Tacos"], skipped: [] },
    ];
    expect(lastMadeDays(r, logs, weekStart)).toBeNull();
  });
});
