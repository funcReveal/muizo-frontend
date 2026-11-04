// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SettingsProvider } from "../model/settingsModel";
import SettingsPage from "./SettingsPage";

vi.mock("../model/useSettingsState", () => {
  const sections = [
    { id: "avatar-effects", categoryId: "display", title: "玩家頭像特效", status: "ready" },
    { id: "scoreboard-effects", categoryId: "display", title: "排行榜邊框特效", status: "ready" },
  ];
  return { useSettingsState: () => ({
    activeCategoryId: "display", setActiveCategoryId: vi.fn(),
    activeAnchorId: "avatar-effects", setActiveAnchorId: vi.fn(),
    categorySections: sections, sections,
    categories: [{ id: "display", title: "顯示", subtitle: "特效" }],
  }) };
});
vi.mock("@shared/ui/AnimatedScoreboardBorder", () => ({ default: () => <span data-testid="scoreboard-effect" /> }));

const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");
afterEach(() => {
  cleanup();
  if (originalScrollTo) Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScrollTo);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  vi.restoreAllMocks();
});

it("loads both effect previews when the display section is rendered", async () => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
  render(<SettingsProvider><SettingsPage onRequestClose={() => {}} /></SettingsProvider>);
  expect(await screen.findByRole("heading", { name: "玩家頭像特效" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "冠軍特效" })).toBeInTheDocument();
  expect(screen.getByText("基礎辨識度")).toBeInTheDocument();
  expect(screen.getByText("3. Combo 10")).toBeInTheDocument();
});
