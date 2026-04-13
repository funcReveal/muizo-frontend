import { describe, expect, it } from "vitest";
import {
  compareGameSyncVersion,
  shouldApplyGameSyncVersion,
} from "./gameSyncVersion";
import type { GameLiveUpdatePayload, GameState, GameSyncVersion } from "./types";

const gameState = (phase: GameState["phase"]): GameState => ({
  status: "playing",
  phase,
  currentIndex: 0,
  startedAt: 1_700_000_000_000,
  revealEndsAt: 1_700_000_030_000,
  guessDurationMs: 30_000,
  revealDurationMs: 8_000,
  choices: [{ title: "A", index: 0 }],
  showVideo: false,
  trackOrder: [0],
  trackCursor: 0,
});

const version = (
  gameSessionId: number,
  phaseVersion: number,
  questionSubmitSeq: number,
  roomVersion: number,
): GameSyncVersion => ({
  gameSessionId,
  phaseVersion,
  questionSubmitSeq,
  roomVersion,
});

describe("compareGameSyncVersion", () => {
  it("treats newer session as newer", () => {
    expect(compareGameSyncVersion(version(2, 0, 0, 0), version(1, 99, 99, 99))).toBe(1);
  });

  it("prefers higher phaseVersion within same session", () => {
    expect(compareGameSyncVersion(version(3, 2, 0, 0), version(3, 1, 99, 99))).toBe(1);
  });

  it("prefers higher questionSubmitSeq within same phase", () => {
    expect(compareGameSyncVersion(version(3, 2, 5, 0), version(3, 2, 4, 99))).toBe(1);
  });

  it("uses roomVersion as final tie-breaker", () => {
    expect(compareGameSyncVersion(version(3, 2, 5, 8), version(3, 2, 5, 7))).toBe(1);
  });
});

describe("game sync guard", () => {
  it("does not let an older gameUpdated overwrite newer state", () => {
    const older: GameLiveUpdatePayload = {
      roomId: "room-1",
      gameState: gameState("guess"),
      serverNow: 1_700_000_000_000,
      syncVersion: version(1, 1, 1, 1),
    };
    const newer: GameLiveUpdatePayload = {
      roomId: "room-1",
      gameState: gameState("reveal"),
      serverNow: 1_700_000_000_500,
      syncVersion: version(1, 2, 0, 2),
    };

    let lastGameSyncVersion: GameSyncVersion | null = null;
    let currentGameState: GameState | null = null;

    const apply = (payload: GameLiveUpdatePayload) => {
      if (!shouldApplyGameSyncVersion(payload.syncVersion, lastGameSyncVersion)) {
        return;
      }
      lastGameSyncVersion = payload.syncVersion;
      currentGameState = payload.gameState;
    };

    apply(newer);
    apply(older);

    expect(currentGameState?.phase).toBe("reveal");
    expect(lastGameSyncVersion).toEqual(version(1, 2, 0, 2));
  });
});
