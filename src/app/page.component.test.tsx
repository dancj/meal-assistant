// @vitest-environment jsdom
import { render } from "@testing-library/react";
import Page from "./page";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

describe("Home page", () => {
  it("renders without crashing", () => {
    const { container } = render(<Page />);
    expect(container).toBeInTheDocument();
  });
});
