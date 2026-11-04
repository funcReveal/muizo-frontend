// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSelectMenuAnchor } from "./selectMenuPlacement";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("updates the menu width when the viewport changes while the trigger is mounted", () => {
  let width = 374;
  vi.stubGlobal("ResizeObserver", undefined);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    width, height: 42, x: 0, y: 0, top: 0, left: 0, right: width, bottom: 42, toJSON: () => ({}),
  }));
  function Example() {
    const { anchorRef, menuWidth } = useSelectMenuAnchor();
    return <div ref={anchorRef}><output aria-label="menu width">{menuWidth}</output></div>;
  }
  render(<Example />);
  expect(screen.getByLabelText("menu width")).toHaveTextContent("374");
  width = 294;
  fireEvent(window, new Event("resize"));
  expect(screen.getByLabelText("menu width")).toHaveTextContent("294");
});
