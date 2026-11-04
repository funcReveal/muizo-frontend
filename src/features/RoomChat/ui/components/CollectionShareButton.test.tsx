// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CollectionShareButton from "./CollectionShareButton";
import ChatMessageBody from "./ChatMessageBody";

const mocks = vi.hoisted(() => ({ fetchCollections: vi.fn() }));
vi.mock("@shared/auth/AuthContext", () => ({ useAuth: () => ({ authUser: { id: "owner" }, authToken: "token", refreshAuthToken: vi.fn() }) }));
vi.mock("@shared/auth/token", () => ({ ensureFreshAuthToken: async () => "token" }));
vi.mock("@features/Collections/shared/api/collectionsApi", () => ({ collectionsApi: { fetchCollections: mocks.fetchCollections } }));

afterEach(cleanup);
beforeEach(() => {
  mocks.fetchCollections.mockReset();
  mocks.fetchCollections.mockResolvedValue([
    { id: "public-1", title: "週末華語歌單", visibility: "public", lifecycle_status: "published", item_count: 24 },
    { id: "private-1", title: "私人作品", visibility: "private" },
    { id: "draft-1", title: "草稿作品", visibility: "public", lifecycle_status: "draft" },
    { id: "removed-1", title: "下架作品", visibility: "public", moderation_status: "taken_down" },
  ]);
});

function setup(messageInput = "", maxLength = 360) {
  const setMessageInput = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CollectionShareButton disabled={false} messageInput={messageInput} setMessageInput={setMessageInput} inputRef={createRef<HTMLInputElement>()} maxLength={maxLength} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "分享我的題庫" }));
  return setMessageInput;
}

describe("collection sharing in chat", () => {
  it("offers only published public collections and preserves the existing draft", async () => {
    const setMessageInput = setup("大家試試看");
    const item = await screen.findByRole("button", { name: /週末華語歌單/ });
    expect(screen.queryByText("私人作品")).not.toBeInTheDocument();
    expect(screen.queryByText("草稿作品")).not.toBeInTheDocument();
    expect(screen.queryByText("下架作品")).not.toBeInTheDocument();
    fireEvent.click(item);
    expect(setMessageInput).toHaveBeenCalledWith(`大家試試看 推薦我的題庫「週末華語歌單」 ${window.location.origin}/rooms?sharedCollection=public-1`);
    expect(mocks.fetchCollections).toHaveBeenCalledWith("token", "owner");
  });

  it("keeps the picker open and preserves the draft when sharing exceeds the message limit", async () => {
    const setMessageInput = setup("a".repeat(350));
    fireEvent.click(await screen.findByRole("button", { name: /週末華語歌單/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("超過 360 字");
    expect(setMessageInput).not.toHaveBeenCalled();
  });

  it("provides retry when owned collections cannot be loaded", async () => {
    mocks.fetchCollections.mockRejectedValueOnce(new Error("無法載入題庫"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("無法載入題庫");
    fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
    expect(await screen.findByRole("button", { name: /週末華語歌單/ })).toBeEnabled();
  });

  it("opens shared collections in a new tab while keeping unrelated links as text", () => {
    render(<ChatMessageBody content={`我的題庫 ${window.location.origin}/rooms?sharedCollection=public-1 https://unrelated.example/rooms?sharedCollection=other`} />);
    const link = screen.getByRole("link", { name: /查看分享題庫/ });
    expect(link).toHaveAttribute("href", "/rooms?sharedCollection=public-1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("provides a new-tab creation action when the player has no collections", async () => {
    mocks.fetchCollections.mockResolvedValue([]);
    setup();
    const create = await screen.findByRole("link", { name: /建立第一份題庫/ });
    expect(create).toHaveAttribute("href", "/collections/new");
    expect(create).toHaveAttribute("target", "_blank");
  });

  it("offers collection management when existing work is private or unfinished", async () => {
    mocks.fetchCollections.mockResolvedValue([{ id: "private-1", title: "私人作品", visibility: "private" }]);
    setup();
    expect(await screen.findByRole("link", { name: /管理我的題庫/ })).toHaveAttribute("href", "/collections");
    expect(screen.getByRole("status")).toHaveTextContent("目前沒有可分享的公開題庫");
  });

  it("lets players recover from an empty search without closing the picker", async () => {
    setup();
    await screen.findByRole("button", { name: /週末華語歌單/ });
    fireEvent.change(screen.getByRole("textbox", { name: "搜尋我的題庫" }), { target: { value: "不存在的名稱" } });
    fireEvent.click(await screen.findByRole("button", { name: "清除搜尋" }));
    expect(screen.getByRole("button", { name: /週末華語歌單/ })).toBeInTheDocument();
  });
});
