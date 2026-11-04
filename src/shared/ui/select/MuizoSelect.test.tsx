// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MuizoSelect from "./MuizoSelect";

afterEach(cleanup);
const options = [
  { value: "all", label: "全部", hideThumbnail: true },
  { value: "blocked", label: "停用選項", disabled: true, hideThumbnail: true },
  { value: "waiting", label: "等待中", description: "尚未開始遊戲", hideThumbnail: true },
];

function Picker() {
  const [value, setValue] = useState("all");
  return <MuizoSelect label="房間狀態" placeholder="請選擇" value={value} options={options} onChange={setValue} />;
}

it("supports keyboard selection, skips disabled options, and restores trigger focus", async () => {
  render(<Picker />);
  const trigger = screen.getByRole("combobox", { name: /房間狀態/ });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => expect(screen.getByRole("option", { name: "全部" })).toHaveFocus());
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: /等待中/ })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Enter" });
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  expect(trigger).toHaveTextContent("等待中");
  expect(trigger).toHaveFocus();
});

it("closes on Escape without changing selection", async () => {
  render(<Picker />);
  const trigger = screen.getByRole("combobox", { name: /房間狀態/ });
  fireEvent.mouseDown(trigger, { button: 0 });
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  expect(trigger).toHaveTextContent("全部");
  expect(trigger).toHaveFocus();
});

it("selects an option by pointer and exposes the current selection", () => {
  const onChange = vi.fn();
  render(<MuizoSelect ariaLabel="狀態" placeholder="請選擇" value="all" options={options} onChange={onChange} />);
  fireEvent.mouseDown(screen.getByRole("combobox"), { button: 0 });
  expect(screen.getByRole("option", { name: "全部" })).toHaveAttribute("aria-selected", "true");
  fireEvent.click(screen.getByRole("option", { name: /等待中/ }));
  expect(onChange).toHaveBeenCalledWith("waiting");
});

it("handles loading, disabled, empty and stale-value states with accessible feedback", () => {
  const props = { ariaLabel: "狀態", placeholder: "請選擇", value: "missing", options: [], onChange: vi.fn() };
  const { rerender } = render(<MuizoSelect {...props} loading />);
  expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("combobox")).toHaveTextContent("載入中…");
  rerender(<MuizoSelect {...props} disabled />);
  expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
  rerender(<MuizoSelect {...props} errorText="請選擇有效項目" />);
  expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("combobox")).toHaveAccessibleDescription("請選擇有效項目");
  expect(screen.getByRole("alert")).toHaveTextContent("請選擇有效項目");
  fireEvent.mouseDown(screen.getByRole("combobox"), { button: 0 });
  expect(screen.getByRole("option", { name: "目前沒有可選項目" })).toHaveAttribute("aria-disabled", "true");
});

it("preserves rich option content and the value submitted by a named form field", () => {
  render(<form aria-label="題庫設定"><MuizoSelect name="playlist" required label="播放清單" placeholder="請選擇" value="playlist-1" options={[{ value: "playlist-1", label: "經典歌曲", thumbnail: "/cover.jpg", description: "公開播放清單", meta: "42 首" }]} onChange={vi.fn()} /></form>);
  expect(screen.getByRole("combobox")).toHaveAttribute("aria-required", "true");
  expect(screen.getByText("公開播放清單")).toBeInTheDocument();
  expect(screen.getByText("42 首")).toBeInTheDocument();
  expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("playlist")).toBe("playlist-1");
});

it("replaces open options with loading feedback while an async refresh runs", () => {
  const props = { label: "狀態", placeholder: "請選擇", value: "all", options, onChange: vi.fn() };
  const { rerender } = render(<MuizoSelect {...props} />);
  fireEvent.mouseDown(screen.getByRole("combobox"), { button: 0 });
  rerender(<MuizoSelect {...props} loading />);
  expect(screen.queryByRole("option", { name: "全部" })).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "載入中…" })).toHaveAttribute("aria-disabled", "true");
  rerender(<MuizoSelect {...props} />);
  expect(screen.getByRole("option", { name: "全部" })).toBeInTheDocument();
});
