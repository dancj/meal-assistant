import { parseRecipients } from "./email";

describe("parseRecipients", () => {
  it("parses a single email", () => {
    expect(parseRecipients("alice@example.com")).toEqual(["alice@example.com"]);
  });

  it("parses multiple emails", () => {
    expect(parseRecipients("alice@example.com,bob@example.com")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("trims whitespace", () => {
    expect(parseRecipients("  alice@example.com , bob@example.com  ")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("filters empty entries", () => {
    expect(parseRecipients("alice@example.com,,bob@example.com,")).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("throws on undefined", () => {
    expect(() => parseRecipients(undefined)).toThrow("EMAIL_RECIPIENTS");
  });

  it("throws on empty string", () => {
    expect(() => parseRecipients("")).toThrow("EMAIL_RECIPIENTS");
  });

  it("throws on whitespace-only string", () => {
    expect(() => parseRecipients("   ")).toThrow("EMAIL_RECIPIENTS");
  });
});
