// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "@features/RoomSession";
import ChatComposer from "./ChatComposer";
import ChatMessagesList from "./ChatMessagesList";

afterEach(cleanup);

describe("room chat surface", () => {
    it("renders the refreshed room empty state", () => {
        const { container } = render(
            <ChatMessagesList
                messages={[]}
                clientId="viewer"
                setScrollNodeRef={() => undefined}
            />,
        );

        expect(screen.getByText("房間還沒有訊息")).toBeInTheDocument();
        expect(container.querySelector(".floating-chat-messages--room")).toBeTruthy();
    });

    it("presents room system events separately from player bubbles", () => {
        const message: ChatMessage = {
            id: "system-event",
            roomId: "room-1",
            userId: "system:round",
            username: "系統",
            content: "第 2 題即將開始",
            timestamp: Date.now(),
        };

        const { container } = render(
            <ChatMessagesList
                messages={[message]}
                clientId="viewer"
                setScrollNodeRef={() => undefined}
            />,
        );

        expect(screen.getByText("今天")).toBeInTheDocument();
        expect(container.querySelector(".floating-chat-msg--system")).toBeTruthy();
    });

    it("sends a room message with Enter and keeps IME input safe", () => {
        const handleSend = vi.fn();
        render(
            <ChatComposer
                inputRef={createRef<HTMLInputElement>()}
                messageInput="大家好"
                setMessageInput={() => undefined}
                handleSend={handleSend}
                isChatCooldownActive={false}
                chatCooldownLeft={0}
            />,
        );

        const input = screen.getByRole("textbox", { name: "房間訊息" });
        fireEvent.keyDown(input, { key: "Enter", isComposing: true });
        expect(handleSend).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: "Enter" });
        expect(handleSend).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("button", { name: "送出訊息" })).toHaveTextContent("送出");
    });
});
