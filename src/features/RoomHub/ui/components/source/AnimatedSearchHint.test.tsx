// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AnimatedSearchHint from "./AnimatedSearchHint";

afterEach(cleanup);

it("immediately hides the visual hint while typing and restores it on clear", () => {
  const { rerender } = render(<AnimatedSearchHint text="Search · 103 items" hidden={false} />);
  const hint = screen.getByText("Search · 103 items").parentElement;
  expect(hint).toHaveAttribute("aria-hidden", "true");
  rerender(<AnimatedSearchHint text="Search · 103 items" hidden />);
  expect(hint).toHaveStyle({ visibility: "hidden" });
  rerender(<AnimatedSearchHint text="Search · 103 items" hidden={false} />);
  expect(hint).toHaveStyle({ visibility: "visible" });
});
