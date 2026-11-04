// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MobileChatFloatingWindow from "./MobileChatFloatingWindow";
import { CHAT_POSITION_KEY } from "../utils/mobileChatPosition";

afterEach(() => { cleanup(); localStorage.clear(); });
const props = () => ({ open: false, unread: 8, title: "大廳聊天室", variant: "hub" as const, onOpen: vi.fn(), onClose: vi.fn(), children: <button>聊天內容</button> });
function pointer(type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true });
  Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
  return event;
}

it("opens on a tap but does not open after dragging, and remembers the drop position", () => {
  const state = props();
  render(<MobileChatFloatingWindow {...state} />);
  const bubble = screen.getByRole("button", { name: /開啟大廳聊天室/ });
  Object.assign(bubble, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });
  fireEvent(bubble, pointer("pointerdown", 900, 650));
  fireEvent(bubble, pointer("pointermove", 100, 150));
  fireEvent(bubble, pointer("pointerup", 100, 150));
  fireEvent.click(bubble, { detail: 1 });
  expect(state.onOpen).not.toHaveBeenCalled();
  const saved = JSON.parse(localStorage.getItem(CHAT_POSITION_KEY)!);
  expect(saved.x).toBeGreaterThanOrEqual(0);
  expect(saved.x).toBeLessThan(1);
  fireEvent(bubble, pointer("pointerdown", 100, 150));
  fireEvent(bubble, pointer("pointerup", 100, 150));
  fireEvent.click(bubble, { detail: 1 });
  expect(state.onOpen).toHaveBeenCalledOnce();
  const snapped = JSON.parse(localStorage.getItem(CHAT_POSITION_KEY)!);
  expect([0, 1]).toContain(snapped.x);
  expect([0, 1]).toContain(snapped.y);
});

it("opens a nonmodal floating dialog without a drawer, handles Escape, and restores bubble focus", () => {
  const state = props();
  const { rerender } = render(<MobileChatFloatingWindow {...state} open />);
  const dialog = screen.getByRole("dialog", { name: "大廳聊天室" });
  expect(dialog).toHaveAttribute("aria-modal", "false");
  expect(dialog).toHaveFocus();
  expect(document.querySelector(".MuiDrawer-root")).toBeNull();
  expect(screen.queryByRole("button", { name: /開啟大廳聊天室/ })).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: "關閉大廳聊天室" });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(toggle).toHaveAttribute("aria-controls", dialog.id);
  fireEvent.click(toggle);
  expect(state.onClose).toHaveBeenCalledOnce();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(state.onClose).toHaveBeenCalledTimes(2);
  rerender(<MobileChatFloatingWindow {...state} />);
  expect(screen.getByRole("button", { name: /開啟大廳聊天室/ })).toHaveFocus();
});

it("supports moving with arrow keys, persisting across remount, and hiding a suppressed trigger", () => {
  const state = props();
  const view = render(<MobileChatFloatingWindow {...state} />);
  fireEvent.keyDown(screen.getByRole("button", { name: /開啟大廳聊天室/ }), { key: "ArrowLeft" });
  const saved = localStorage.getItem(CHAT_POSITION_KEY);
  expect(saved).not.toBeNull();
  view.unmount();
  const next = render(<MobileChatFloatingWindow {...state} />);
  expect(localStorage.getItem(CHAT_POSITION_KEY)).toBe(saved);
  next.rerender(<MobileChatFloatingWindow {...state} suppressTrigger />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  next.rerender(<MobileChatFloatingWindow {...state} suppressTrigger open />);
  expect(screen.getByRole("button", { name: "關閉大廳聊天室" })).toBeInTheDocument();
});
