// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HubChatComposer from "./HubChatComposer";

afterEach(cleanup);

describe("HubChatComposer room sharing cooldown", () => {
  it("disables only room sharing and exposes the remaining time", () => {
    render(
      <HubChatComposer
        isAuthenticated
        isConnected
        inputRef={createRef<HTMLInputElement>()}
        messageInput="仍可聊天"
        setMessageInput={() => undefined}
        handleSend={vi.fn()}
        canShareRoom
        onShareRoom={vi.fn()}
        shareCooldownLeft={18}
        onLoginRequired={vi.fn()}
        isSending={false}
        statusText={null}
        isChatCooldownActive={false}
        chatCooldownLeft={0}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "房間分享冷卻中，18 秒後可再次分享",
      }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "送出大廳訊息" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "大廳訊息" })).toBeEnabled();
  });
});
