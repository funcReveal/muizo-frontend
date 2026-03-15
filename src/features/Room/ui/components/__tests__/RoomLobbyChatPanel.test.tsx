// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "../../../model/types";
import RoomLobbyChatPanel from "../RoomLobbyChatPanel";

const messages: ChatMessage[] = [
  {
    id: "presence-1",
    roomId: "room-1",
    userId: "system:presence",
    username: "系統",
    content: "A 已加入房間",
    timestamp: 1000,
  },
  {
    id: "settlement-review:round-old",
    roomId: "room-1",
    userId: "system:settlement-review",
    username: "系統",
    content: "第 1 局結束，房主排名 2/4，得分 620，答對 3/5 題。",
    timestamp: 2000,
  },
  {
    id: "settlement-review:round-latest",
    roomId: "room-1",
    userId: "system:settlement-review",
    username: "系統",
    content: "第 2 局結束，房主排名 1/4，得分 980，答對 5/5 題。",
    timestamp: 3000,
  },
];

describe("RoomLobbyChatPanel", () => {
  it("renders latest settlement and archived history actions separately", () => {
    const onOpenSettlementByRoundKey = vi.fn();
    const onOpenHistoryDrawer = vi.fn();

    render(
      <RoomLobbyChatPanel
        messages={messages}
        messageInput=""
        onInputChange={() => {}}
        onSend={() => {}}
        latestSettlementRoundKey="round-latest"
        onOpenHistoryDrawer={onOpenHistoryDrawer}
        onOpenSettlementByRoundKey={onOpenSettlementByRoundKey}
      />,
    );

    expect(screen.getByText("A 已加入房間")).toBeInTheDocument();
    expect(
      screen.getByText("第 1 局結束，房主排名 2/4，得分 620，答對 3/5 題。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("第 2 局結束，房主排名 1/4，得分 980，答對 5/5 題。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看上一局" }));
    fireEvent.click(screen.getByRole("button", { name: "查看對戰資訊" }));

    expect(onOpenSettlementByRoundKey).toHaveBeenCalledWith("round-latest");
    expect(onOpenHistoryDrawer).toHaveBeenCalledTimes(1);
  });
});
