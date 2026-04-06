import { useCallback, useEffect, useRef } from "react";
import {
  playSynthSfx,
  type GameSfxEvent,
  type SfxPresetId,
} from "../sfx/gameSfxEngine";

type UseGameSfxOptions = {
  enabled: boolean;
  volume: number;
  preset: SfxPresetId;
};

export const useGameSfx = ({ enabled, volume, preset }: UseGameSfxOptions) => {
  const sfxAudioContextRef = useRef<AudioContext | null>(null);

  const getSfxAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (sfxAudioContextRef.current) return sfxAudioContextRef.current;
    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      sfxAudioContextRef.current = new AudioContextCtor();
      return sfxAudioContextRef.current;
    } catch (error) {
      console.error("Failed to create SFX AudioContext", error);
      return null;
    }
  }, []);

  const primeSfxAudio = useCallback(() => {
    const ctx = getSfxAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {
        // Ignore autoplay restrictions until user interacts again.
      });
    }
  }, [getSfxAudioContext]);

  const playGameSfx = useCallback(
    (event: GameSfxEvent, offsetSec = 0) => {
      if (!enabled) return false;
      const ctx = getSfxAudioContext();
      if (!ctx) return false;
      if (ctx.state === "suspended") {
        void ctx
          .resume()
          .then(() => {
            playSynthSfx(ctx, preset, event, volume / 100, offsetSec);
          })
          .catch(() => {
            // Ignore autoplay restrictions until the next user gesture.
          });
        return false;
      }
      playSynthSfx(ctx, preset, event, volume / 100, offsetSec);
      return true;
    },
    [enabled, getSfxAudioContext, preset, volume],
  );

  useEffect(
    () => () => {
      const ctx = sfxAudioContextRef.current;
      sfxAudioContextRef.current = null;
      if (!ctx) return;
      void ctx.close().catch(() => {
        // Ignore close errors during unmount.
      });
    },
    [],
  );

  return {
    primeSfxAudio,
    playGameSfx,
  };
};

export type UseGameSfxResult = ReturnType<typeof useGameSfx>;
export type PlayGameSfx = UseGameSfxResult["playGameSfx"];
export type { GameSfxEvent, SfxPresetId };
