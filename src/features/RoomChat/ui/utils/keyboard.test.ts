// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { isGlobalChatShortcutTarget } from "./keyboard";

afterEach(() => {
  document.body.replaceChildren();
});

describe("isGlobalChatShortcutTarget", () => {
  it("protects the message editor from global chat shortcuts", () => {
    const chat = document.createElement("div");
    chat.className = "floating-chat-root";
    const editor = document.createElement("textarea");
    chat.append(editor);
    document.body.append(chat);

    expect(isGlobalChatShortcutTarget(editor)).toBe(true);
  });

  it("allows shortcuts when focus is on non-interactive page content", () => {
    const content = document.createElement("div");
    document.body.append(content);

    expect(isGlobalChatShortcutTarget(content)).toBe(false);
  });
});
