// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

afterEach(cleanup);
const props = () => ({ open: true, title: "確定要登出？", description: "登出後仍可瀏覽公開題庫，重新登入即可繼續遊玩。", confirmLabel: "確認登出", cancelLabel: "保持登入", onConfirm: vi.fn(), onCancel: vi.fn() });
it("focuses the cancel action and never confirms when canceling or pressing Escape", () => {
  const state = props();
  render(<ConfirmDialog {...state} />);
  const dialog = screen.getByRole("dialog", { name: "確定要登出？" });
  expect(dialog).toHaveAccessibleDescription(state.description);
  expect(screen.getByRole("button", { name: "保持登入" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "保持登入" }));
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(state.onCancel).toHaveBeenCalledTimes(2);
  expect(state.onConfirm).not.toHaveBeenCalled();
});
it("confirms only through the confirmation action and retains optional shared dialog content", () => {
  const state = props();
  render(<ConfirmDialog {...state} icon={<span>icon</span>} extraContent={<p>額外確認內容</p>} />);
  expect(screen.getByText("額外確認內容")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "確認登出" }));
  expect(state.onConfirm).toHaveBeenCalledOnce();
  expect(state.onCancel).not.toHaveBeenCalled();
});
