import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import type { MealPlan } from "@/lib/plan/types";

const sendMock = vi.fn();

vi.mock("@/lib/resend", () => ({
  getResend: () => ({ emails: { send: sendMock } }),
}));

import { MissingEnvVarError, ResendUpstreamError } from "./errors";
import { sendMealPlanEmail } from "./send";

function makePlan(): MealPlan {
  return {
    meals: [
      { title: "M1", kidVersion: null, dealMatches: [] },
      { title: "M2", kidVersion: null, dealMatches: [] },
      { title: "M3", kidVersion: null, dealMatches: [] },
      { title: "M4", kidVersion: null, dealMatches: [] },
      { title: "M5", kidVersion: null, dealMatches: [] },
    ],
    groceryList: [],
  };
}

let logSpy: MockInstance;
let errorSpy: MockInstance;

beforeEach(() => {
  sendMock.mockReset();
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "noreply@example.com";
  process.env.EMAIL_RECIPIENTS = "alice@example.com,bob@example.com";
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_RECIPIENTS;
  logSpy.mockRestore();
  errorSpy.mockRestore();
  vi.clearAllMocks();
});

describe("sendMealPlanEmail — happy path", () => {
  it("sends with the formatted subject/html/text and returns the Resend id", async () => {
    sendMock.mockResolvedValue({ data: { id: "re_abc123" }, error: null });

    const result = await sendMealPlanEmail(makePlan(), "2026-04-27");

    expect(result).toEqual({ id: "re_abc123" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.from).toBe("noreply@example.com");
    expect(call.to).toEqual(["alice@example.com", "bob@example.com"]);
    expect(call.subject).toMatch(/April 27, 2026/);
    expect(typeof call.html).toBe("string");
    expect(typeof call.text).toBe("string");
    expect(call.html).toContain("M1");
    expect(call.text).toContain("M1");
  });

  it("supports a single recipient", async () => {
    process.env.EMAIL_RECIPIENTS = "alice@example.com";
    sendMock.mockResolvedValue({ data: { id: "re_x" }, error: null });

    await sendMealPlanEmail(makePlan(), "2026-04-27");

    expect(sendMock.mock.calls[0][0].to).toEqual(["alice@example.com"]);
  });
});

describe("sendMealPlanEmail — env errors", () => {
  it("throws MissingEnvVarError when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendMealPlanEmail(makePlan(), "2026-04-27")).rejects.toThrow(
      MissingEnvVarError,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("throws MissingEnvVarError when EMAIL_FROM is unset", async () => {
    delete process.env.EMAIL_FROM;
    await expect(sendMealPlanEmail(makePlan(), "2026-04-27")).rejects.toThrow(
      MissingEnvVarError,
    );
    try {
      await sendMealPlanEmail(makePlan(), "2026-04-27");
    } catch (err) {
      expect((err as MissingEnvVarError).message).toContain("EMAIL_FROM");
    }
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("throws MissingEnvVarError when EMAIL_FROM is whitespace", async () => {
    process.env.EMAIL_FROM = "   ";
    await expect(sendMealPlanEmail(makePlan(), "2026-04-27")).rejects.toThrow(
      MissingEnvVarError,
    );
  });

  it("throws MissingEnvVarError when EMAIL_RECIPIENTS is unset", async () => {
    delete process.env.EMAIL_RECIPIENTS;
    await expect(sendMealPlanEmail(makePlan(), "2026-04-27")).rejects.toThrow(
      MissingEnvVarError,
    );
    try {
      await sendMealPlanEmail(makePlan(), "2026-04-27");
    } catch (err) {
      expect((err as MissingEnvVarError).message).toContain(
        "EMAIL_RECIPIENTS",
      );
    }
  });
});

describe("sendMealPlanEmail — resend failures", () => {
  it("wraps a return-value error in ResendUpstreamError", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "domain unverified", name: "validation_error" },
    });

    try {
      await sendMealPlanEmail(makePlan(), "2026-04-27");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ResendUpstreamError);
      expect((err as ResendUpstreamError).message).toContain(
        "domain unverified",
      );
      expect((err as ResendUpstreamError).resendErrorName).toBe(
        "validation_error",
      );
    }
  });

  it("wraps a thrown network error in ResendUpstreamError", async () => {
    sendMock.mockRejectedValue(new Error("ECONNRESET"));

    try {
      await sendMealPlanEmail(makePlan(), "2026-04-27");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ResendUpstreamError);
      expect((err as ResendUpstreamError).message).toContain("ECONNRESET");
    }
  });

  it("wraps a return-value error with no name", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "something" },
    });
    await expect(sendMealPlanEmail(makePlan(), "2026-04-27")).rejects.toThrow(
      ResendUpstreamError,
    );
  });
});

describe("sendMealPlanEmail — log hygiene", () => {
  it("does not log RESEND_API_KEY or recipient addresses on success", async () => {
    sendMock.mockResolvedValue({ data: { id: "re_abc123" }, error: null });

    await sendMealPlanEmail(makePlan(), "2026-04-27");

    const allLogs = logSpy.mock.calls.flat().join(" ");
    expect(allLogs).not.toContain("test-key");
    expect(allLogs).not.toContain("alice@example.com");
    expect(allLogs).not.toContain("bob@example.com");
  });

  it("does not put RESEND_API_KEY into thrown error messages", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "boom", name: "err" },
    });
    try {
      await sendMealPlanEmail(makePlan(), "2026-04-27");
    } catch (err) {
      expect((err as Error).message).not.toContain("test-key");
    }
  });
});
