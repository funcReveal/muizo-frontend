import type { GameSyncVersion } from "./types";

const normalizePart = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : -1;

export function compareGameSyncVersion(
  a: GameSyncVersion | null | undefined,
  b: GameSyncVersion | null | undefined,
): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const partsA = [
    normalizePart(a.gameSessionId),
    normalizePart(a.phaseVersion),
    normalizePart(a.questionSubmitSeq),
    normalizePart(a.roomVersion),
  ];
  const partsB = [
    normalizePart(b.gameSessionId),
    normalizePart(b.phaseVersion),
    normalizePart(b.questionSubmitSeq),
    normalizePart(b.roomVersion),
  ];

  for (let index = 0; index < partsA.length; index += 1) {
    if (partsA[index] === partsB[index]) continue;
    return partsA[index] > partsB[index] ? 1 : -1;
  }

  return 0;
}

export function shouldApplyGameSyncVersion(
  incoming: GameSyncVersion | null | undefined,
  current: GameSyncVersion | null | undefined,
): boolean {
  return compareGameSyncVersion(incoming, current) > 0;
}
