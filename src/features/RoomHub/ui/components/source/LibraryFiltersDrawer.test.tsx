// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LibraryFiltersDrawer from "./LibraryFiltersDrawer";

afterEach(cleanup);
it("presents an accessible drawer with fixed result, reset and close actions", () => {
  const close = vi.fn(), reset = vi.fn();
  render(<LibraryFiltersDrawer open onClose={close} onReset={reset} resultCount={103} loading={false}><button aria-pressed="false">動畫主題</button></LibraryFiltersDrawer>);
  expect(screen.getByRole("dialog", { name: "篩選題庫" })).toHaveAttribute("aria-modal", "true");
  fireEvent.click(screen.getByRole("button", { name: "清除篩選" }));
  expect(reset).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "顯示 103 筆題庫" }));
  expect(close).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "關閉篩選" }));
  expect(close).toHaveBeenCalledTimes(2);
});
it("uses a stable completion action while results load, and supports Escape", () => {
  const close = vi.fn();
  render(<LibraryFiltersDrawer open onClose={close} resultCount={null} loading><span>分類</span></LibraryFiltersDrawer>);
  expect(screen.getByRole("button", { name: "查看題庫" })).toBeEnabled();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
});
