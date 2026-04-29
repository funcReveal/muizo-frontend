import { describe, expect, it, vi } from "vitest";

import {
  emitResultYoutubeCtaClicked,
  openTrackedResultYoutubeCta,
  resolveTrackableYoutubeVideoId,
  sanitizeResultYoutubeCtaPayload,
} from "./resultYoutubeCtaTracking";

describe("resultYoutubeCtaTracking", () => {
  it("sanitizes the tracking payload before emit", () => {
    expect(
      sanitizeResultYoutubeCtaPayload({
        roomId: " room-1 ",
        matchId: "match-1",
        videoId: "dQw4w9WgXcQ",
        questionIndex: 2.9,
        source: "result_review",
        buttonPlacement: "review_open_youtube_button",
      }),
    ).toEqual({
      roomId: "room-1",
      matchId: "match-1",
      videoId: "dQw4w9WgXcQ",
      questionIndex: 2,
      source: "result_review",
      buttonPlacement: "review_open_youtube_button",
    });
  });

  it("drops invalid video ids without dropping the click event", () => {
    expect(
      sanitizeResultYoutubeCtaPayload({
        roomId: "room-1",
        videoId: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: "result_summary",
        buttonPlacement: "support_creator_button",
      }),
    ).toEqual({
      roomId: "room-1",
      source: "result_summary",
      buttonPlacement: "support_creator_button",
    });
  });

  it("extracts a YouTube video id from safe known fields", () => {
    expect(
      resolveTrackableYoutubeVideoId({
        href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=private",
      }),
    ).toBe("dQw4w9WgXcQ");
  });

  it("emits fire-and-forget tracking", () => {
    const socket = { emit: vi.fn() };

    emitResultYoutubeCtaClicked(socket as never, {
      roomId: "room-1",
      source: "question_review",
      buttonPlacement: "video_overlay_pause_cta",
      questionIndex: 3,
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "trackResultYoutubeCtaClicked",
      {
        roomId: "room-1",
        source: "question_review",
        buttonPlacement: "video_overlay_pause_cta",
        questionIndex: 3,
      },
      expect.any(Function),
    );
  });

  it("opens YouTube even when tracking emit throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const socket = {
      emit: vi.fn(() => {
        throw new Error("socket unavailable");
      }),
    };
    const openWindow = vi.fn();

    openTrackedResultYoutubeCta({
      socket: socket as never,
      href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      payload: {
        roomId: "room-1",
        videoId: "dQw4w9WgXcQ",
        source: "result_review",
        buttonPlacement: "review_open_youtube_button",
      },
      openWindow,
    });

    expect(openWindow).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "_blank",
      "noopener,noreferrer",
    );
    consoleError.mockRestore();
  });
});

