// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemePill } from "./theme-pill";

describe("ThemePill", () => {
  it("renders Taco Tuesday with forest pill classes and an icon", () => {
    const { container } = render(
      <ThemePill theme={{ tag: "taco-tuesday", label: "Taco Tuesday" }} />,
    );
    const pill = screen.getByText("Taco Tuesday").parentElement as HTMLElement;
    expect(pill).toHaveClass("bg-forest-soft", "text-forest-2");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Fish Friday with the fish icon", () => {
    const { container } = render(
      <ThemePill theme={{ tag: "fish-friday", label: "Fish Friday" }} />,
    );
    expect(screen.getByText("Fish Friday")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
