import { useEffect, useRef } from "react";

import type { GameState } from "../../Room/model/types";
import {
  resolveCorrectResultSfxEvent,
  resolveComboMilestoneSfxEvent,
  resolveCountdownSfxEvent,
  resolveGuessDeadlineSfxEvent,
} from "../../../shared/sfx/gameSfxEngine";
import { triggerHapticFeedback } from "./gameRoomUtils";
import type { PlayGameSfx } from "./useGameSfx";

interface UseGameRoomSfxEffectsInput {
  gamePhase: GameState["phase"];
  gameStartedAt: number;
  trackSessionKey: string;
  isEnded: boolean;
  isReveal: boolean;
  isInterTrackWait: boolean;
  waitingToStart: boolean;
  preStartCountdownSfxSec: number;
  phaseCountdownSec: number | null;
  meClientId?: string;
  // Reveal result fields
  selectedChoice: number | null;
  myHasAnswered: boolean;
  myIsCorrect: boolean;
  myResolvedScoreBreakdown: { comboBonusPoints?: number } | null;
  // Combo fields
  comboBreakTier: number;
  isComboBreakThisQuestion: boolean;
  myIsCorrectForCombo: boolean;
  myComboMilestone: boolean;
  myComboNow: number;
  myComboTier: number;
  getServerNowMs: () => number;
  playGameSfx: PlayGameSfx;
}

/**
 * Manages all in-game SFX side-effects for GameRoomPage.
 *
 * Previously these 5 useEffect blocks lived inline in GameRoomPage, making
 * the component harder to scan. Extracting them here:
 *  - Groups audio-cue logic in one place
 *  - Lets GameRoomPage focus on UI state and rendering
 */
export function useGameRoomSfxEffects({
  gamePhase,
  gameStartedAt,
  trackSessionKey,
  isEnded,
  isReveal,
  isInterTrackWait,
  waitingToStart,
  preStartCountdownSfxSec,
  phaseCountdownSec,
  meClientId,
  selectedChoice,
  myHasAnswered,
  myIsCorrect,
  myResolvedScoreBreakdown,
  comboBreakTier,
  isComboBreakThisQuestion,
  myIsCorrectForCombo,
  myComboMilestone,
  myComboNow,
  myComboTier,
  getServerNowMs,
  playGameSfx,
}: UseGameRoomSfxEffectsInput) {
  const lastPreStartCountdownSfxKeyRef = useRef<string | null>(null);
  const lastGuessUrgencySfxKeyRef = useRef<string | null>(null);
  const lastCountdownGoSfxKeyRef = useRef<string | null>(null);
  const lastRevealResultSfxKeyRef = useRef<string | null>(null);
  const lastComboStateSfxKeyRef = useRef<string | null>(null);

  // Pre-start countdown beep
  useEffect(() => {
    if (isEnded || !waitingToStart || isInterTrackWait) return;
    const sfxKey = `${trackSessionKey}:prestart:${preStartCountdownSfxSec}`;
    if (lastPreStartCountdownSfxKeyRef.current === sfxKey) return;
    lastPreStartCountdownSfxKeyRef.current = sfxKey;
    playGameSfx(resolveCountdownSfxEvent(preStartCountdownSfxSec));
  }, [
    isEnded,
    isInterTrackWait,
    playGameSfx,
    preStartCountdownSfxSec,
    trackSessionKey,
    waitingToStart,
  ]);

  // Guess urgency countdown beeps (last 3 seconds)
  useEffect(() => {
    if (
      gamePhase !== "guess" ||
      isEnded ||
      waitingToStart ||
      phaseCountdownSec === null ||
      phaseCountdownSec > 3
    ) {
      return;
    }
    const sfxKey = `${trackSessionKey}:${gamePhase}:countdown:${phaseCountdownSec}`;
    if (lastGuessUrgencySfxKeyRef.current === sfxKey) return;
    lastGuessUrgencySfxKeyRef.current = sfxKey;
    playGameSfx(resolveGuessDeadlineSfxEvent(phaseCountdownSec));
  }, [
    gamePhase,
    isEnded,
    phaseCountdownSec,
    playGameSfx,
    trackSessionKey,
    waitingToStart,
  ]);

  // "Go" sound when guess phase starts
  useEffect(() => {
    if (isEnded) return;
    if (gamePhase !== "guess") return;
    const sfxKey = `${trackSessionKey}:guess:go:${gameStartedAt}`;
    if (lastCountdownGoSfxKeyRef.current === sfxKey) return;
    const currentNowMs = getServerNowMs();
    const msUntilStart = gameStartedAt - currentNowMs;
    if (msUntilStart > 500) return;
    if (msUntilStart <= -220) return;
    const fireDelay = Math.max(0, msUntilStart + 60);
    const timer = window.setTimeout(() => {
      if (lastCountdownGoSfxKeyRef.current === sfxKey) return;
      lastCountdownGoSfxKeyRef.current = sfxKey;
      playGameSfx("go");
    }, fireDelay);
    return () => window.clearTimeout(timer);
  }, [
    gamePhase,
    gameStartedAt,
    getServerNowMs,
    isEnded,
    playGameSfx,
    trackSessionKey,
    waitingToStart,
  ]);

  // Reveal result SFX (correct / wrong / unanswered)
  useEffect(() => {
    if (!isReveal || isInterTrackWait || waitingToStart || isEnded) return;
    if (!meClientId) return;

    let resultSfxEvent:
      | "correct"
      | "correctCombo1"
      | "correctCombo2"
      | "correctCombo3"
      | "correctCombo4"
      | "correctCombo5"
      | "wrong"
      | "unanswered";
    let comboBonusKey = 0;

    if (!myHasAnswered || selectedChoice === null) {
      resultSfxEvent = "unanswered";
    } else if (myIsCorrect) {
      if (!myResolvedScoreBreakdown) return;
      comboBonusKey = Math.max(
        0,
        Math.floor(myResolvedScoreBreakdown.comboBonusPoints ?? 0),
      );
      resultSfxEvent = resolveCorrectResultSfxEvent(comboBonusKey) as
        | "correct"
        | "correctCombo1"
        | "correctCombo2"
        | "correctCombo3"
        | "correctCombo4"
        | "correctCombo5";
    } else {
      resultSfxEvent = "wrong";
    }

    const sfxKey = `${trackSessionKey}:reveal:result:${resultSfxEvent}:${comboBonusKey}`;
    if (lastRevealResultSfxKeyRef.current === sfxKey) return;
    lastRevealResultSfxKeyRef.current = sfxKey;
    playGameSfx(resultSfxEvent);
    if (resultSfxEvent === "wrong") {
      triggerHapticFeedback("wrong");
      return;
    }
    if (resultSfxEvent === "unanswered") return;
    triggerHapticFeedback("correct");
  }, [
    isEnded,
    isInterTrackWait,
    isReveal,
    meClientId,
    myHasAnswered,
    myIsCorrect,
    myResolvedScoreBreakdown,
    playGameSfx,
    selectedChoice,
    trackSessionKey,
    waitingToStart,
  ]);

  // Combo break / milestone SFX
  useEffect(() => {
    if (!isReveal || isInterTrackWait || waitingToStart || isEnded) return;
    if (!meClientId) return;
    let timerId: number | null = null;
    if (isComboBreakThisQuestion && comboBreakTier > 0) {
      const sfxKey = `${trackSessionKey}:combo-break:${comboBreakTier}`;
      if (lastComboStateSfxKeyRef.current === sfxKey) return;
      lastComboStateSfxKeyRef.current = sfxKey;
      timerId = window.setTimeout(() => {
        playGameSfx("comboBreak");
        triggerHapticFeedback("comboBreak");
      }, 110);
      return () => {
        if (timerId !== null) window.clearTimeout(timerId);
      };
    }
    if (!myIsCorrectForCombo || !myComboMilestone || myComboTier <= 0) return;
    const sfxKey = `${trackSessionKey}:combo-up:${myComboNow}:${myComboTier}`;
    if (lastComboStateSfxKeyRef.current === sfxKey) return;
    lastComboStateSfxKeyRef.current = sfxKey;
    const comboMilestoneSfxEvent = resolveComboMilestoneSfxEvent(myComboTier);
    timerId = window.setTimeout(() => {
      playGameSfx(comboMilestoneSfxEvent);
      triggerHapticFeedback("combo");
    }, 120);
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [
    comboBreakTier,
    isComboBreakThisQuestion,
    isEnded,
    isInterTrackWait,
    isReveal,
    meClientId,
    myComboMilestone,
    myComboNow,
    myComboTier,
    myIsCorrectForCombo,
    playGameSfx,
    trackSessionKey,
    waitingToStart,
  ]);
}
