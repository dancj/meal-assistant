import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MealPlan } from "@/lib/plan/types";

const sendMealPlanEmailMock = vi.fn();

vi.mock("@/lib/email/send", () => ({
  sendMealPlanEmail: (...args: unknown[]) => sendMealPlanEmailMock(...args),
}));

import { POST } from "./route";
import {
  MissingEnvVarError,
  ResendUpstreamError,
} from "@/lib/email/errors";

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

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  sendMealPlanEmailMock.mockReset();
  delete process.env.DEMO_MODE;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/email — happy paths", () => {
  it("sends and returns 200 with the Resend id", async () => {
    sendMealPlanEmailMock.mockResolvedValue({ id: "re_abc123" });
    const res = await POST(jsonRequest(makePlan()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, id: "re_abc123" });
    expect(sendMealPlanEmailMock).toHaveBeenCalledTimes(1);
    const [planArg, weekArg] = sendMealPlanEmailMock.mock.calls[0];
    expect(planArg).toEqual(makePlan());
    expect(typeof weekArg).toBe("string");
    expect(weekArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("DEMO_MODE=1 returns a fake-success without calling the sender", async () => {
    process.env.DEMO_MODE = "1";
    const res = await POST(jsonRequest(makePlan()));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Demo-Mode")).toBe("1");
    expect(await res.json()).toEqual({ ok: true, id: "demo-email-id" });
    expect(sendMealPlanEmailMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/email — input errors", () => {
  it("400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(sendMealPlanEmailMock).not.toHaveBeenCalled();
  });

  it("400 on empty body {}", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.path).toBe("meals");
  });

  it("400 when meals array has 4 entries", async () => {
    const plan = makePlan();
    plan.meals.pop();
    const res = await POST(jsonRequest(plan));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.path).toBe("meals");
  });

  it("400 when groceryList is missing", async () => {
    const res = await POST(jsonRequest({ meals: makePlan().meals }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.path).toBe("groceryList");
  });
});

describe("POST /api/email — sender errors", () => {
  it("500 on MissingEnvVarError(RESEND_API_KEY)", async () => {
    sendMealPlanEmailMock.mockRejectedValue(
      new MissingEnvVarError("RESEND_API_KEY"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jsonRequest(makePlan()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("RESEND_API_KEY");
    errSpy.mockRestore();
  });

  it("500 on MissingEnvVarError(EMAIL_FROM)", async () => {
    sendMealPlanEmailMock.mockRejectedValue(
      new MissingEnvVarError("EMAIL_FROM"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jsonRequest(makePlan()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("EMAIL_FROM");
    errSpy.mockRestore();
  });

  it("502 on ResendUpstreamError with detail in body", async () => {
    sendMealPlanEmailMock.mockRejectedValue(
      new ResendUpstreamError("domain unverified", "validation_error"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jsonRequest(makePlan()));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Resend upstream error");
    expect(body.detail).toContain("domain unverified");
    errSpy.mockRestore();
  });

  it("500 on unexpected error type", async () => {
    sendMealPlanEmailMock.mockRejectedValue(new Error("kaboom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jsonRequest(makePlan()));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Unexpected error");
    errSpy.mockRestore();
  });
});

describe("POST /api/email — secret hygiene", () => {
  it("never includes RESEND_API_KEY value in any error response body", async () => {
    process.env.RESEND_API_KEY = "sk_super_secret_value_12345";
    const cases: Array<() => unknown> = [
      () => sendMealPlanEmailMock.mockRejectedValue(new Error("kaboom")),
      () =>
        sendMealPlanEmailMock.mockRejectedValue(
          new ResendUpstreamError("upstream"),
        ),
      () =>
        sendMealPlanEmailMock.mockRejectedValue(
          new MissingEnvVarError("EMAIL_FROM"),
        ),
    ];
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const setup of cases) {
      setup();
      const res = await POST(jsonRequest(makePlan()));
      const text = await res.text();
      expect(text).not.toContain("sk_super_secret_value_12345");
    }
    errSpy.mockRestore();
    delete process.env.RESEND_API_KEY;
  });
});
