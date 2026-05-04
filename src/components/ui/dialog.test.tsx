// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTitle,
} from "./dialog";

describe("Dialog (Editorial Modal)", () => {
  it("renders the popup with Editorial palette + 640px max width + 90vh max height", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Add meal</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    expect(popup).toBeTruthy();
    expect(popup).toHaveClass("bg-paper", "border", "border-paper-edge", "max-w-[640px]", "max-h-[90vh]");
    expect(popup).toHaveClass("flex", "flex-col");
  });

  it("includes duration-medium + ease-editorial motion classes", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>x</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    expect(popup.className).toContain("duration-medium");
    expect(popup.className).toContain("ease-editorial");
  });

  it("close button has aria-label='Close'", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("DialogBody is flex-1 with overflow-y-auto so long content scrolls within max-h-[90vh]", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogBody data-testid="body">content</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const body = screen.getByTestId("body");
    expect(body).toHaveClass("flex-1", "overflow-y-auto");
  });

  it("DialogFooter is sticky paper-2 with paper-edge top border", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogFooter data-testid="footer">x</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("footer")).toHaveClass(
      "sticky",
      "bottom-0",
      "bg-paper-2",
      "border-t",
      "border-paper-edge",
    );
  });

  it("DialogHeader has paper-edge bottom border", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>x</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId("header")).toHaveClass("border-b", "border-paper-edge");
  });
});

describe("Modal alias re-exports", () => {
  it("Modal is the same component as Dialog", () => {
    expect(Modal).toBe(Dialog);
    expect(ModalContent).toBe(DialogContent);
    expect(ModalTitle).toBe(DialogTitle);
    expect(ModalBody).toBe(DialogBody);
    expect(ModalFooter).toBe(DialogFooter);
  });
});
