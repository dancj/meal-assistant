import { afterEach, describe, expect, it } from "vitest";
import { readEnvZip } from "./env";
import { InvalidZipError } from "./errors";

describe("readEnvZip", () => {
  afterEach(() => {
    delete process.env.TEST_ZIP;
  });

  it("returns the fallback when the env var is unset", () => {
    expect(readEnvZip("TEST_ZIP", "34238")).toBe("34238");
  });

  it("returns the env value when it is a valid 5-digit ZIP", () => {
    process.env.TEST_ZIP = "12345";
    expect(readEnvZip("TEST_ZIP", "34238")).toBe("12345");
  });

  it("returns the fallback when the env var is empty", () => {
    process.env.TEST_ZIP = "";
    expect(readEnvZip("TEST_ZIP", "34238")).toBe("34238");
  });

  it("returns the fallback when the env var is whitespace-only", () => {
    process.env.TEST_ZIP = "   ";
    expect(readEnvZip("TEST_ZIP", "34238")).toBe("34238");
  });

  it("throws InvalidZipError when the env var is non-numeric", () => {
    process.env.TEST_ZIP = "abc";
    expect(() => readEnvZip("TEST_ZIP", "34238")).toThrow(InvalidZipError);
    expect(() => readEnvZip("TEST_ZIP", "34238")).toThrow(/TEST_ZIP/);
  });

  it("throws InvalidZipError when the env var has fewer than 5 digits", () => {
    process.env.TEST_ZIP = "1234";
    expect(() => readEnvZip("TEST_ZIP", "34238")).toThrow(InvalidZipError);
  });

  it("throws InvalidZipError when the env var has more than 5 digits", () => {
    process.env.TEST_ZIP = "123456";
    expect(() => readEnvZip("TEST_ZIP", "34238")).toThrow(InvalidZipError);
  });

  it("throws InvalidZipError when the env var mixes digits and letters", () => {
    process.env.TEST_ZIP = "1234a";
    expect(() => readEnvZip("TEST_ZIP", "34238")).toThrow(InvalidZipError);
  });

  it("carries the offending var name on the error", () => {
    process.env.TEST_ZIP = "abc";
    try {
      readEnvZip("TEST_ZIP", "34238");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidZipError);
      expect((err as InvalidZipError).varName).toBe("TEST_ZIP");
    }
  });
});
