// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CollectionToolDrawer from "./CollectionToolDrawer";

afterEach(cleanup);
it("supports Escape dismissal and exposes a named modal", () => {
  const close = vi.fn();
  render(
    <CollectionToolDrawer open onClose={close} label="播放片段">
      <button>套用</button>
    </CollectionToolDrawer>,
  );
  const dialog = screen.getByRole("dialog", { name: "播放片段" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  expect(close).toHaveBeenCalledOnce();
});
it("prevents Escape dismissal during a write", () => {
  const close = vi.fn();
  render(
    <CollectionToolDrawer open busy onClose={close} label="答案寫入">
      <button disabled>儲存中</button>
    </CollectionToolDrawer>,
  );
  fireEvent.keyDown(screen.getByRole("dialog"), {
    key: "Escape",
    code: "Escape",
  });
  expect(close).not.toHaveBeenCalled();
});
