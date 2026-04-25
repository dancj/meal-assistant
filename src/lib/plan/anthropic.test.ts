import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _resetAnthropicClientForTests,
  getAnthropicClient,
  MODEL,
} from "./anthropic";
import { MissingEnvVarError } from "./errors";

describe("getAnthropicClient", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    _resetAnthropicClientForTests();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
    _resetAnthropicClientForTests();
  });

  it("returns an Anthropic client when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const client = getAnthropicClient();
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
  });

  it("memoizes the client across calls", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const a = getAnthropicClient();
    const b = getAnthropicClient();
    expect(a).toBe(b);
  });

  it("throws MissingEnvVarError when ANTHROPIC_API_KEY is unset", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => getAnthropicClient()).toThrow(MissingEnvVarError);
    expect(() => getAnthropicClient()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("does not interpolate the value into the missing-env error", () => {
    delete process.env.ANTHROPIC_API_KEY;
    try {
      getAnthropicClient();
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as MissingEnvVarError).message).not.toMatch(/sk-/);
    }
  });

  it("treats an empty ANTHROPIC_API_KEY as unset", () => {
    process.env.ANTHROPIC_API_KEY = "";
    expect(() => getAnthropicClient()).toThrow(MissingEnvVarError);
  });

  it("treats a whitespace-only ANTHROPIC_API_KEY as unset", () => {
    process.env.ANTHROPIC_API_KEY = "   ";
    expect(() => getAnthropicClient()).toThrow(MissingEnvVarError);
  });

  it("uses claude-sonnet-4-6 as the model constant", () => {
    expect(MODEL).toBe("claude-sonnet-4-6");
  });
});
