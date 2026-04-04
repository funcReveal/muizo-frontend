// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "../../../features/Room/model/types";
import { ChatInputContext } from "../ChatInputContext";
import RoomLobbyChatPanel from "../RoomLobbyChatPanel";

const chatInputValue = {
  messageInput: "",
  setMessageInput: () => {},
  handleSendMessage: () => {},
};

const messages: ChatMessage[] = [
  {
    id: "presence-1",
    roomId: "room-1",
    userId: "system:presence",
    username: "系統",
    content: "A 加入了房間",
    timestamp: 1000,
  },
  {
    id: "settlement-review:round-old",
    roomId: "room-1",
    userId: "system:settlement-review",
    username: "系統",
    content: "第 1 局結算：答對 2/4，得分 620，最高連擊 3/5。",
    timestamp: 2000,
  },
  {
    id: "settlement-review:round-latest",
    roomId: "room-1",
    userId: "system:settlement-review",
    username: "系統",
    content: "第 2 局結算：答對 1/4，得分 980，最高連擊 5/5。",
    timestamp: 3000,
  },
];

describe("RoomLobbyChatPanel", () => {
  it("renders latest settlement and archived history actions separately", () => {
    const onOpenSettlementByRoundKey = vi.fn();
    const onOpenHistoryDrawer = vi.fn();

    render(
      <ChatInputContext.Provider value={chatInputValue}>
        <RoomLobbyChatPanel
          messages={messages}
          latestSettlementRoundKey="round-latest"
          onOpenHistoryDrawer={onOpenHistoryDrawer}
          onOpenSettlementByRoundKey={onOpenSettlementByRoundKey}
        />
      </ChatInputContext.Provider>,
    );

    expect(screen.getByText("A 加入了房間")).toBeInTheDocument();
    expect(
      screen.getByText("第 1 局結算：答對 2/4，得分 620，最高連擊 3/5。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("第 2 局結算：答對 1/4，得分 980，最高連擊 5/5。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看結算" }));
    fireEvent.click(screen.getByRole("button", { name: "查看歷史" }));

    expect(onOpenSettlementByRoundKey).toHaveBeenCalledWith("round-latest");
    expect(onOpenHistoryDrawer).toHaveBeenCalledTimes(1);
  });
});
