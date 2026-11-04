// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import SiteTooltip from "./SiteTooltip";

afterEach(cleanup);
it("shows a custom accessible hint without a native title", async () => {
  render(<SiteTooltip title="登入後選取私人題庫"><button>私人收藏庫</button></SiteTooltip>);
  const button = screen.getByRole("button");
  expect(button).not.toHaveAttribute("title");
  fireEvent.mouseOver(button);
  expect(await screen.findByRole("tooltip")).toHaveTextContent("登入後選取私人題庫");
  expect(button).toHaveAccessibleDescription("登入後選取私人題庫");
  expect(button).not.toHaveAttribute("title");
});

it("allows pointer interaction in an interactive tooltip", async () => {
  render(<SiteTooltip title="曲目清單" interactiveContent><button>查看曲目</button></SiteTooltip>);
  fireEvent.mouseOver(screen.getByRole("button"));
  expect(await screen.findByRole("tooltip")).toHaveStyle({ pointerEvents: "auto" });
});
