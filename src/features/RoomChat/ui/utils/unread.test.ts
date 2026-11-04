import { describe, expect, it } from "vitest";

import { countUnreadMessages } from "./unread";

const messages = [{ id: "1" }, { id: "2" }, { id: "3" }];

describe("countUnreadMessages", () => {
  it("does not report unread messages for the visible tab", () => {
    expect(countUnreadMessages(messages, "1", true)).toBe(0);
  });

  it("counts messages received after the last visible message", () => {
    expect(countUnreadMessages(messages, "1", false)).toBe(2);
  });

  it("treats a missing history anchor as unread", () => {
    expect(countUnreadMessages(messages, "expired-message", false)).toBe(3);
  });
});
