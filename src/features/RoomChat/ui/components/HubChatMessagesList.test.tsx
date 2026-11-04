// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render as renderComponent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HubChatMessage } from "@features/RoomSession";
import HubChatMessagesList from "./HubChatMessagesList";

afterEach(cleanup);
const render = (ui: ReactNode) => renderComponent(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const message: HubChatMessage = {
  id: "message-1",
  userId: "user-1",
  username: "測試玩家",
  content: "原始訊息",
  timestamp: Date.now(),
  kind: "text",
};

const renderList = (onEditMessage = vi.fn()) => {
  render(
    <HubChatMessagesList
      messages={[message]}
      setScrollNodeRef={() => undefined}
      viewerId="user-1"
      onEditMessage={onEditMessage}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編輯訊息" }));
  return { onEditMessage };
};

describe("HubChatMessagesList message editor", () => {
  it("disables saving unchanged or blank text", () => {
    const { onEditMessage } = renderList();
    expect(screen.getByRole("button", { name: "儲存編輯" })).toBeDisabled();
    const editor = screen.getByRole("textbox", { name: "編輯大廳訊息" });
    fireEvent.change(editor, { target: { value: "   " } });
    fireEvent.keyDown(editor, { key: "Enter" });
    expect(screen.getByRole("button", { name: "儲存編輯" })).toBeDisabled();
    expect(onEditMessage).not.toHaveBeenCalled();
    expect(editor).toBeInTheDocument();
  });

  it("does not save while confirming Chinese IME composition", () => {
    const { onEditMessage } = renderList();
    const editor = screen.getByRole("textbox", { name: "編輯大廳訊息" });
    fireEvent.change(editor, { target: { value: "中文輸入測試" } });
    fireEvent.keyDown(editor, { key: "Enter", isComposing: true, keyCode: 229 });
    expect(onEditMessage).not.toHaveBeenCalled();
    expect(editor).toBeInTheDocument();
    fireEvent.keyDown(editor, { key: "Enter" });
    expect(onEditMessage).toHaveBeenCalledWith("message-1", "中文輸入測試");
  });
  it("saves with Enter without requiring a mouse action", () => {
    const { onEditMessage } = renderList();
    const editor = screen.getByRole("textbox", { name: "編輯大廳訊息" });

    fireEvent.change(editor, { target: { value: "更新後的訊息" } });
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(onEditMessage).toHaveBeenCalledWith("message-1", "更新後的訊息");
    expect(screen.queryByRole("textbox", { name: "編輯大廳訊息" })).toBeNull();
  });

  it("keeps editing on Shift + Enter and cancels with Escape", () => {
    const { onEditMessage } = renderList();
    const editor = screen.getByRole("textbox", { name: "編輯大廳訊息" });

    fireEvent.keyDown(editor, { key: "Enter", shiftKey: true });
    expect(onEditMessage).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "編輯大廳訊息" })).toBeTruthy();

    fireEvent.keyDown(editor, { key: "Escape" });
    expect(onEditMessage).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: "編輯大廳訊息" })).toBeNull();
  });
});

describe("HubChatMessagesList room invites", () => {
  it("does not allow joining the room the viewer is already in", () => {
    const onJoinRoom = vi.fn();
    const invite: HubChatMessage = {
      ...message,
      id: "room-invite",
      kind: "room_invite",
      content: "",
      roomInvite: {
        roomCode: "ABCD12",
        name: "目前房間",
        playerCount: 2,
        maxPlayers: 8,
        playlistTitle: "測試歌單",
        playlistCoverThumbnailUrl: null,
        modeLabel: "休閒",
        isRanked: false,
        questionCount: 20,
        hasPin: false,
        isPlaying: false,
        status: "available",
      },
    };

    render(
      <HubChatMessagesList
        messages={[invite]}
        setScrollNodeRef={() => undefined}
        currentRoomCode="abcd12"
        onJoinRoom={onJoinRoom}
      />,
    );

    const button = screen.getByRole("button", { name: "目前所在房間" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onJoinRoom).not.toHaveBeenCalled();
  });
});

describe("lobby chat empty states", () => {
  it("does not mistake loading for an empty conversation", () => {
    render(<HubChatMessagesList messages={[]} setScrollNodeRef={() => undefined} loadState="loading" />);
    expect(screen.getByRole("status")).toHaveTextContent("正在載入大廳訊息");
    expect(screen.queryByText("大廳還沒有訊息")).not.toBeInTheDocument();
  });

  it("offers retry when history failed to load", () => {
    const retry = vi.fn();
    render(<HubChatMessagesList messages={[]} setScrollNodeRef={() => undefined} loadState="error" onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("暫時無法載入訊息");
    fireEvent.click(screen.getByRole("button", { name: "重新載入訊息" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText("大廳還沒有訊息")).not.toBeInTheDocument();
  });

  it("explains what players can do in a successfully loaded but empty chat", () => {
    render(<HubChatMessagesList messages={[]} setScrollNodeRef={() => undefined} loadState="ready" />);
    expect(screen.getByRole("status")).toHaveTextContent("大廳還沒有訊息");
    expect(screen.getByRole("status")).toHaveTextContent("聊聊喜歡的歌");
  });
});
