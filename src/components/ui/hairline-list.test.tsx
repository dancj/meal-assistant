// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HairlineList } from "./hairline-list";

describe("HairlineList", () => {
  it("defaults to a <div> root", () => {
    const { container } = render(
      <HairlineList>
        <div>a</div>
        <div>b</div>
      </HairlineList>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
  });

  it("applies the hairline divider selector to children", () => {
    const { container } = render(
      <HairlineList>
        <div>a</div>
        <div>b</div>
      </HairlineList>,
    );
    const root = container.firstElementChild as HTMLElement;
    // Tailwind's `[&>*+*]:border-t [&>*+*]:border-paper-edge` selector
    // ensures the first child has no top border; siblings carry the rule.
    expect(root.className).toContain("[&>*+*]:border-t");
    expect(root.className).toContain("[&>*+*]:border-paper-edge");
  });

  it("renders as <ul> when as='ul'", () => {
    const { container } = render(
      <HairlineList as="ul">
        <li>a</li>
        <li>b</li>
      </HairlineList>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("UL");
  });

  it("renders as <ol> when as='ol'", () => {
    const { container } = render(
      <HairlineList as="ol">
        <li>a</li>
      </HairlineList>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("OL");
  });

  it("renders without throwing for a single child or an empty list", () => {
    expect(() =>
      render(<HairlineList><div>only</div></HairlineList>),
    ).not.toThrow();
    expect(() => render(<HairlineList />)).not.toThrow();
  });

  it("merges custom className after the defaults", () => {
    const { container } = render(
      <HairlineList className="rounded-md">
        <div>a</div>
      </HairlineList>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("rounded-md");
  });
});
