// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerProfileAvatar from "./PlayerProfileAvatar";

const { fetchProfile } = vi.hoisted(() => ({ fetchProfile: vi.fn() }));
vi.mock("../model/publicPlayerApi", async (original) => ({ ...await original<typeof import("../model/publicPlayerApi")>(), fetchPublicPlayer: fetchProfile }));

beforeEach(() => {
  fetchProfile.mockReset();
  fetchProfile.mockResolvedValue({ id: "public-id", displayName: "音樂玩家", bio: "一起猜歌", totalMatches: 42, bestCombo: 12, publicCollectionCount: 3 });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

function setup(userId: string | null = "test:player") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PlayerProfileAvatar userId={userId} username="音樂玩家" size={40} /></QueryClientProvider>);
}

describe("player profile avatar", () => {
  it("does not fetch until opened, then shows default-public statistics and new-tab links", async () => {
    setup();
    expect(fetchProfile).not.toHaveBeenCalled();
    const trigger = screen.getByRole("link", { name: /查看音樂玩家/ });
    expect(trigger).toHaveAttribute("target", "_blank");
    fireEvent.click(trigger, { detail: 1 });
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看個人頁" })).toHaveAttribute("href", "/players/public-id");
    expect(screen.getByRole("link", { name: "查看個人頁" })).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "玩家簡介" })).not.toBeInTheDocument();
  });

  it("waits for a deliberate hover and cancels when the pointer leaves early", async () => {
    vi.useFakeTimers();
    setup();
    const trigger = screen.getByRole("link");
    const enter = new MouseEvent("pointerover", { bubbles: true });
    Object.defineProperty(enter, "pointerType", { value: "mouse" });
    fireEvent(trigger, enter);
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    fireEvent.pointerLeave(trigger);
    act(() => { vi.advanceTimersByTime(300); });
    expect(fetchProfile).not.toHaveBeenCalled();
    fireEvent(trigger, enter);
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole("group", { name: "玩家簡介" })).toBeInTheDocument();
  });

  it("renders unidentified historical messages without broken profile links", () => {
    setup(null);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(fetchProfile).not.toHaveBeenCalled();
  });
});
