import { describe, expect, it, vi } from "vitest";

import {
  buildResultHistoryTrackingKey,
  emitResultHistoryEvent,
  sanitizeResultHistoryPayload,
} from "./resultHistoryTracking";

describe("resultHistoryTracking", () => {
  it("sanitizes allowed result history metadata", () => {
    expect(
      sanitizeResultHistoryPayload({
        eventName: "result.page.revisited",
        roomId: " room-1 ",
        matchId: "match-1",
        source: "history_page",
        entryPoint: "history_list",
        viewType: "full_result",
        isRevisit: true,
        questionIndex: 2.8,
      }),
    ).toEqual({
      eventName: "result.page.revisited",
      roomId: "room-1",
      matchId: "match-1",
      source: "history_page",
      entryPoint: "history_list",
      viewType: "full_result",
      isRevisit: true,
      questionIndex: 2,
    });
  });

  it("drops invalid event names and invalid metadata values", () => {
    expect(
      sanitizeResultHistoryPayload({
        eventName: "result.scroll.changed" as never,
        source: "scroll" as never,
        entryPoint: "hover" as never,
        viewType: "drawer_dragged" as never,
      }),
    ).toBeNull();

    expect(
      sanitizeResultHistoryPayload({
        eventName: "match_history.opened",
        source: "profile",
        entryPoint: "profile_recent_match",
        viewType: "summary",
        questionIndex: -1,
      }),
    ).toEqual({
      eventName: "match_history.opened",
      source: "profile",
      entryPoint: "profile_recent_match",
      viewType: "summary",
    });
  });

  it("emits result.page.viewed as a fire-and-forget event", () => {
    const socket = { emit: vi.fn() };

    emitResultHistoryEvent(socket as never, {
      eventName: "result.page.viewed",
      roomId: "room-1",
      matchId: "match-1",
      source: "post_game",
      entryPoint: "auto_result",
      viewType: "summary",
      isRevisit: false,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "trackResultHistoryEvent",
      {
        eventName: "result.page.viewed",
        roomId: "room-1",
        matchId: "match-1",
        source: "post_game",
        entryPoint: "auto_result",
        viewType: "summary",
        isRevisit: false,
      },
      expect.any(Function),
    );
  });

  it("does not throw when tracking emit fails", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const socket = {
      emit: vi.fn(() => {
        throw new Error("socket unavailable");
      }),
    };

    expect(() =>
      emitResultHistoryEvent(socket as never, {
        eventName: "match_history.result.opened",
        matchId: "match-1",
        source: "history_page",
        entryPoint: "history_list",
        viewType: "full_result",
        isRevisit: true,
      }),
    ).not.toThrow();

    consoleError.mockRestore();
  });

  it("builds a page-lifecycle dedupe key without using UI-noise fields", () => {
    expect(
      buildResultHistoryTrackingKey({
        eventName: "result.page.viewed",
        matchId: "match-1",
        source: "post_game",
        entryPoint: "auto_result",
        viewType: "summary",
      }),
    ).toBe("result.page.viewed:match-1:summary:auto_result");
  });
});

