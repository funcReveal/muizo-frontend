// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerProfilePage from "./PlayerProfilePage";
import { PlayerProfileError } from "../model/publicPlayerApi";

const mocks = vi.hoisted(() => ({ fetchPlayer: vi.fn(), fetchCollections: vi.fn(), saveBio: vi.fn() }));
vi.mock("../model/publicPlayerApi", async (original) => ({
  ...await original<typeof import("../model/publicPlayerApi")>(),
  fetchPublicPlayer: mocks.fetchPlayer, fetchPublicCollections: mocks.fetchCollections, savePublicBio: mocks.saveBio,
}));
vi.mock("@shared/auth/AuthContext", () => ({ useAuth: () => ({ authUser: { id: "test:owner" }, authToken: "token", authLoading: false, refreshAuthToken: vi.fn() }) }));
vi.mock("@shared/auth/token", () => ({ ensureFreshAuthToken: async () => "token" }));
const profile = { id: "public-id", displayName: "音樂玩家", bio: "喜歡動畫音樂", avatarUrl: null, joinedAt: "2026-03-03T18:00:00Z", totalMatches: 42, bestCombo: 12, publicCollectionCount: 1, canEdit: false };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchPlayer.mockResolvedValue(profile);
  mocks.fetchCollections.mockResolvedValue({ items: [{ id: "collection-1", title: "動畫歌單", itemCount: 24, useCount: 80 }], total: 1, page: 1, pageSize: 12 });
  mocks.saveBio.mockResolvedValue({ ...profile, bio: "新的自我介紹", canEdit: true });
});
afterEach(cleanup);
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/players/public-id"]}><Routes><Route path="/players/:reference" element={<PlayerProfilePage />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe("public player page", () => {
  it("shows default-public statistics and opens collection links in a separate tab", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: "音樂玩家" })).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    const collection = await screen.findByRole("link", { name: /查看題庫：動畫歌單/ });
    expect(collection).toHaveAttribute("target", "_blank");
    expect(collection).toHaveAttribute("href", "/rooms?sharedCollection=collection-1");
    expect(screen.queryByRole("button", { name: "編輯自介" })).not.toBeInTheDocument();
  });

  it("lets the owner edit their introduction and displays the saved result", async () => {
    mocks.fetchPlayer.mockResolvedValue({ ...profile, canEdit: true });
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "編輯自介" }));
    fireEvent.change(screen.getByRole("textbox", { name: /自我介紹/ }), { target: { value: "新的自我介紹" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存自介" }));
    await waitFor(() => expect(mocks.saveBio).toHaveBeenCalledWith("token", "新的自我介紹"));
    expect(await screen.findByText("新的自我介紹")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("自我介紹已更新");
  });

  it("provides a useful unavailable state for missing or suspended accounts", async () => {
    mocks.fetchPlayer.mockRejectedValueOnce(new PlayerProfileError("找不到這位玩家", 404));
    setup();
    expect(await screen.findByRole("heading", { name: "找不到這位玩家" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("目前無法公開查看");
    expect(screen.queryByRole("button", { name: "重新載入" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回到大廳" })).toHaveAttribute("href", "/rooms");
  });
  it("explains a new player's missing records without suggesting owner actions to visitors", async () => {
    mocks.fetchPlayer.mockResolvedValue({ ...profile, totalMatches: 0, bestCombo: 0, publicCollectionCount: 0, bio: "" });
    mocks.fetchCollections.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 12 });
    setup();
    expect(await screen.findByLabelText("尚無連擊紀錄")).toBeInTheDocument();
    expect(await screen.findByText("這位玩家還沒有公開題庫")).toBeInTheDocument();
    expect(screen.getByText(/完成第一場猜歌後就會顯示戰績/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /管理我的題庫/ })).not.toBeInTheDocument();
  });

  it("gives owners clear next steps when their bio and public collections are empty", async () => {
    mocks.fetchPlayer.mockResolvedValue({ ...profile, bio: "", canEdit: true, publicCollectionCount: 0 });
    mocks.fetchCollections.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 12 });
    setup();
    expect(await screen.findByRole("button", { name: "新增自我介紹" })).toBeInTheDocument();
    const manage = await screen.findByRole("link", { name: /管理我的題庫/ });
    expect(manage).toHaveAttribute("href", "/collections");
    expect(manage).toHaveAttribute("target", "_blank");
  });
});
