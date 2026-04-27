// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock, toastSuccess, toastError } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>(
    "@/lib/api/client",
  );
  return {
    ...actual,
    sendEmail: (plan: unknown) => sendEmailMock(plan),
  };
});

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

import { EmailButton } from "./email-button";
import type { MealPlan } from "@/lib/plan/types";

const plan: MealPlan = {
  meals: [
    { title: "M1", kidVersion: null, dealMatches: [] },
    { title: "M2", kidVersion: null, dealMatches: [] },
    { title: "M3", kidVersion: null, dealMatches: [] },
    { title: "M4", kidVersion: null, dealMatches: [] },
    { title: "M5", kidVersion: null, dealMatches: [] },
  ],
  groceryList: [],
};

beforeEach(() => {
  sendEmailMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("EmailButton — render + click", () => {
  it("renders the labeled button", () => {
    render(<EmailButton plan={plan} disabled={false} />);
    expect(
      screen.getByRole("button", { name: /email me this/i }),
    ).toBeInTheDocument();
  });

  it("POSTs the plan and shows success toast with id", async () => {
    sendEmailMock.mockResolvedValue({ ok: true, id: "re_abc123" });
    render(<EmailButton plan={plan} disabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: /email me this/i }));

    await waitFor(() => {
      expect(sendEmailMock).toHaveBeenCalledWith(plan);
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
    expect(toastSuccess.mock.calls[0][0]).toMatch(/email sent/i);
    const description = toastSuccess.mock.calls[0][1]?.description;
    expect(description).toContain("re_abc123");
  });

  it("shows 'Sending…' while in flight and reverts on settle", async () => {
    let resolve!: (v: unknown) => void;
    sendEmailMock.mockImplementation(
      () => new Promise((r) => (resolve = r)),
    );

    render(<EmailButton plan={plan} disabled={false} />);
    const button = screen.getByRole("button", { name: /email me this/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
    expect(button).toBeDisabled();

    resolve({ ok: true, id: "re_x" });

    await waitFor(() => {
      expect(screen.getByText(/email me this/i)).toBeInTheDocument();
    });
    expect(button).not.toBeDisabled();
  });
});

describe("EmailButton — disabled state", () => {
  it("does not POST when disabled prop is true", () => {
    render(<EmailButton plan={plan} disabled={true} />);
    const button = screen.getByRole("button", { name: /email me this/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not double-POST when clicked rapidly while in flight", async () => {
    let resolve!: (v: unknown) => void;
    sendEmailMock.mockImplementation(
      () => new Promise((r) => (resolve = r)),
    );

    render(<EmailButton plan={plan} disabled={false} />);
    const button = screen.getByRole("button", { name: /email me this/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });
    resolve({ ok: true, id: "re_x" });
  });
});

describe("EmailButton — error path", () => {
  it("shows an error toast and re-enables the button on rejection", async () => {
    sendEmailMock.mockRejectedValue(new Error("upstream blew up"));

    render(<EmailButton plan={plan} disabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: /email me this/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(toastError.mock.calls[0][0]).toMatch(/couldn.?t send email/i);
    expect(toastError.mock.calls[0][1]?.description).toContain("upstream blew up");
    // Button is back to its idle label
    expect(
      screen.getByRole("button", { name: /email me this/i }),
    ).toBeInTheDocument();
  });
});
