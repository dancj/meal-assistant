import { parseRecipeMarkdown, RecipeParseError } from "./parse";

const FULL = `---
title: Chicken Tacos
tags: [quick, protein, mexican]
kid_version: plain chicken quesadilla, no seasoning, no toppings
---

## Ingredients

- chicken
- tortillas

## Instructions

Cook the chicken.
`;

describe("parseRecipeMarkdown", () => {
  describe("happy path", () => {
    it("parses full frontmatter with title, tags, and kid_version", () => {
      const recipe = parseRecipeMarkdown(FULL, "chicken-tacos.md");
      expect(recipe.title).toBe("Chicken Tacos");
      expect(recipe.tags).toEqual(["quick", "protein", "mexican"]);
      expect(recipe.kidVersion).toBe(
        "plain chicken quesadilla, no seasoning, no toppings",
      );
      expect(recipe.filename).toBe("chicken-tacos.md");
      expect(recipe.content).toContain("## Ingredients");
      expect(recipe.content).toContain("## Instructions");
    });

    it("sets kidVersion to null when kid_version key is absent", () => {
      const source = `---
title: Pasta
tags: [quick, vegetarian]
---

Boil water.
`;
      const recipe = parseRecipeMarkdown(source, "pasta.md");
      expect(recipe.kidVersion).toBeNull();
      expect(recipe.tags).toEqual(["quick", "vegetarian"]);
    });

    it("sets kidVersion to null when kid_version is present but has no YAML value", () => {
      const source = `---
title: Pasta
tags: [quick]
kid_version:
---

Boil water.
`;
      const recipe = parseRecipeMarkdown(source, "pasta.md");
      expect(recipe.kidVersion).toBeNull();
    });

    it("defaults tags to empty array when tags key is absent", () => {
      const source = `---
title: Soup
---

Simmer.
`;
      const recipe = parseRecipeMarkdown(source, "soup.md");
      expect(recipe.tags).toEqual([]);
      expect(recipe.kidVersion).toBeNull();
    });

    it("preserves an explicitly empty tags array", () => {
      const source = `---
title: Soup
tags: []
---

Simmer.
`;
      const recipe = parseRecipeMarkdown(source, "soup.md");
      expect(recipe.tags).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("preserves --- lines in the body (only the leading frontmatter block is stripped)", () => {
      const source = `---
title: Divider Recipe
---

First step.

---

Second step.
`;
      const recipe = parseRecipeMarkdown(source, "divider.md");
      expect(recipe.content).toContain("First step.");
      expect(recipe.content).toContain("---");
      expect(recipe.content).toContain("Second step.");
    });

    it("parses correctly with CRLF line endings", () => {
      const source =
        "---\r\ntitle: Windows Recipe\r\ntags: [test]\r\n---\r\n\r\nBody here.\r\n";
      const recipe = parseRecipeMarkdown(source, "windows.md");
      expect(recipe.title).toBe("Windows Recipe");
      expect(recipe.tags).toEqual(["test"]);
      expect(recipe.content).toContain("Body here.");
    });
  });

  describe("error paths", () => {
    it("throws when kid_version is an explicit empty string", () => {
      const source = `---
title: Pasta
kid_version: ""
---

Body.
`;
      expect(() => parseRecipeMarkdown(source, "pasta.md")).toThrow(
        RecipeParseError,
      );
    });

    it("throws when there is no frontmatter at all", () => {
      const source = "Just a plain markdown body with no frontmatter.\n";
      expect(() => parseRecipeMarkdown(source, "plain.md")).toThrow(
        /title/i,
      );
    });

    it("throws when frontmatter is present but has no title key", () => {
      const source = `---
tags: [quick]
---

Body.
`;
      expect(() => parseRecipeMarkdown(source, "notitle.md")).toThrow(
        /notitle\.md/,
      );
    });

    it("throws when title is not a string", () => {
      const source = `---
title: 42
---

Body.
`;
      expect(() => parseRecipeMarkdown(source, "numeric.md")).toThrow(
        RecipeParseError,
      );
    });

    it("throws when tags is a string instead of an array", () => {
      const source = `---
title: Stir Fry
tags: "quick, asian"
---

Body.
`;
      expect(() => parseRecipeMarkdown(source, "stirfry.md")).toThrow(
        RecipeParseError,
      );
    });

    it("throws when tags is an array containing non-strings", () => {
      const source = `---
title: Stir Fry
tags: [1, 2, 3]
---

Body.
`;
      expect(() => parseRecipeMarkdown(source, "stirfry.md")).toThrow(
        RecipeParseError,
      );
    });

    it("RecipeParseError message begins with the filename", () => {
      const source = "No frontmatter here.\n";
      try {
        parseRecipeMarkdown(source, "broken.md");
        throw new Error("expected parseRecipeMarkdown to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(RecipeParseError);
        expect((err as Error).message.startsWith("broken.md:")).toBe(true);
      }
    });

    it("RecipeParseError carries the filename on the instance", () => {
      const source = "No frontmatter here.\n";
      try {
        parseRecipeMarkdown(source, "broken.md");
        throw new Error("expected parseRecipeMarkdown to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(RecipeParseError);
        expect((err as RecipeParseError).filename).toBe("broken.md");
      }
    });
  });
});
