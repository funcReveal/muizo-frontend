import { describe, expect, it } from "vitest";

import {
  getSettlementIdentityFromSnapshot,
  getSettlementIdentityFromSummary,
  shouldApplySettlementAsyncActivation,
  shouldAutoOpenSettlementCandidate,
  shouldClearDismissedSettlementIdentity,
  shouldRequireCurrentGameSettlement,
} from "../lib/roomLobbySettlementOrchestration";

describe("roomLobbySettlementOrchestration", () => {
  it("uses a stable identity for the same finished match across summary and replay snapshots", () => {
    const summaryIdentity = getSettlementIdentityFromSummary({
      matchId: "room-1:12",
      roundKey: "room-1:started-at",
      roundNo: 12,
      roomId: "room-1",
      roomName: "Room",
      startedAt: 100,
      endedAt: 200,
      status: "ended",
      playerCount: 4,
      questionCount: 10,
      summaryJson: null,
    });
    const replayIdentity = getSettlementIdentityFromSnapshot({
      roundKey: "room-1:ended-at",
      roundNo: 12,
      startedAt: 100,
      endedAt: 200,
      room: {
        id: "room-1",
        roomCode: "ABCD",
        name: "Room",
        playerCount: 4,
        createdAt: 1,
        hasPassword: false,
        playlistCount: 10,
        hostClientId: "host",
        playlist: {
          items: [],
          totalCount: 10,
          receivedCount: 10,
          ready: true,
          pageSize: 50,
        },
      },
      participants: [],
      messages: [],
      trackOrder: [],
      playedQuestionCount: 10,
      questionRecaps: [],
    });

    expect(summaryIdentity).toBe("room-1:12");
    expect(replayIdentity).toBe(summaryIdentity);
  });

  it("prevents auto-open from reactivating the same dismissed match", () => {
    expect(
      shouldAutoOpenSettlementCandidate({
        candidateIdentity: "room-1:12",
        previousTopIdentity: "room-1:11",
        dismissedIdentity: "room-1:12",
        autoOpenedIdentity: null,
      }),
    ).toBe(false);
  });

  it("ignores late async replay completions after the same settlement was dismissed", () => {
    expect(
      shouldApplySettlementAsyncActivation({
        requestVersion: 2,
        latestRequestVersion: 2,
        requestedIdentity: "room-1:12",
        resultIdentity: "room-1:12",
        dismissedIdentity: "room-1:12",
      }),
    ).toBe(false);

    expect(
      shouldApplySettlementAsyncActivation({
        requestVersion: 2,
        latestRequestVersion: 3,
        requestedIdentity: "room-1:12",
        resultIdentity: "room-1:12",
        dismissedIdentity: null,
      }),
    ).toBe(false);
  });

  it("allows a genuinely newer finished match to auto-open after the previous one was dismissed", () => {
    expect(
      shouldClearDismissedSettlementIdentity({
        dismissedIdentity: "room-1:12",
        latestIdentity: "room-1:13",
      }),
    ).toBe(true);

    expect(
      shouldAutoOpenSettlementCandidate({
        candidateIdentity: "room-1:13",
        previousTopIdentity: "room-1:12",
        dismissedIdentity: null,
        autoOpenedIdentity: "room-1:12",
      }),
    ).toBe(true);
  });

  it("constrains automatic leaderboard settlement to the current game session", () => {
    expect(
      shouldRequireCurrentGameSettlement({
        isLeaderboardChallenge: true,
        isSettlementView: true,
        isExplicitReview: false,
        targetGameSessionId: 7,
      }),
    ).toBe(true);
  });

  it("does not constrain explicit settlement review to the current game session", () => {
    expect(
      shouldRequireCurrentGameSettlement({
        isLeaderboardChallenge: true,
        isSettlementView: true,
        isExplicitReview: true,
        targetGameSessionId: 7,
      }),
    ).toBe(false);
  });
});
