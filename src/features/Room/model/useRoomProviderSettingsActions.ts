import { useCallback, type Dispatch, type SetStateAction } from "react";

import {
  CHUNK_SIZE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_START_OFFSET_SEC,
} from "./roomConstants";
import {
  applyGameSettingsPatch,
  buildUploadPlaylistItems,
  formatAckError,
  mergeGameSettings,
  mergeRoomSummaryIntoCurrentRoom,
  type RoomGameSettings,
} from "./roomProviderUtils";
import {
  clampPlayDurationSec,
  clampRevealDurationSec,
  clampStartOffsetSec,
} from "./roomUtils";
import type {
  Ack,
  ClientSocket,
  PlaylistItem,
  PlaybackExtensionMode,
  RoomState,
  RoomSummary,
} from "./types";

type RoomSettingsPayload = {
  name?: string;
  visibility?: "public" | "private";
  password?: string | null;
  pin?: string | null;
  questionCount?: number;
  playDurationSec?: number;
  revealDurationSec?: number;
  startOffsetSec?: number;
  allowCollectionClipTiming?: boolean;
  allowParticipantInvite?: boolean;
  playbackExtensionMode?: PlaybackExtensionMode;
  maxPlayers?: number | null;
};

interface UseRoomProviderSettingsActionsParams {
  getSocket: () => ClientSocket | null;
  currentRoom: RoomState["room"] | null;
  fetchCompletePlaylist: (roomId: string) => Promise<PlaylistItem[]>;
  saveRoomPassword: (roomId: string, password: string | null) => void;
  setHostRoomPassword: Dispatch<SetStateAction<string | null>>;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setStatusText: (value: string | null) => void;
}

export const useRoomProviderSettingsActions = ({
  getSocket,
  currentRoom,
  fetchCompletePlaylist,
  saveRoomPassword,
  setHostRoomPassword,
  setCurrentRoom,
  setStatusText,
}: UseRoomProviderSettingsActionsParams) => {
  const syncRoomPlaylistTiming = useCallback(
    async (
      room: RoomState["room"],
      gameSettingsOverride?: Partial<RoomGameSettings>,
    ) => {
      const socket = getSocket();
      if (!socket) return false;
      const sourceItems = await fetchCompletePlaylist(room.id);
      if (sourceItems.length === 0) return false;

      const gameSettings = mergeGameSettings(
        room.gameSettings,
        gameSettingsOverride,
      );
      const uploadItems = buildUploadPlaylistItems(sourceItems, {
        playDurationSec:
          gameSettings.playDurationSec ?? DEFAULT_PLAY_DURATION_SEC,
        startOffsetSec: gameSettings.startOffsetSec ?? DEFAULT_START_OFFSET_SEC,
        allowCollectionClipTiming:
          gameSettings.allowCollectionClipTiming ?? true,
      });
      if (uploadItems.length === 0) return false;

      const uploadId =
        crypto.randomUUID?.() ??
        `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
      const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
      const remaining = uploadItems.slice(CHUNK_SIZE);
      const isLast = remaining.length === 0;

      const changePlaylistOk = await new Promise<boolean>((resolve) => {
        socket.emit(
          "changePlaylist",
          {
            roomId: room.id,
            playlist: {
              uploadId,
              id: room.playlist.id,
              title: room.playlist.title,
              totalCount: uploadItems.length,
              items: firstChunk,
              isLast,
              pageSize: room.playlist.pageSize || DEFAULT_PAGE_SIZE,
            },
          },
          (
            ack: Ack<{
              receivedCount: number;
              totalCount: number;
              ready: boolean;
            }>,
          ) => {
            resolve(Boolean(ack?.ok));
          },
        );
      });
      if (!changePlaylistOk) {
        setStatusText("同步播放清單失敗");
        return false;
      }

      if (remaining.length > 0) {
        for (let index = 0; index < remaining.length; index += CHUNK_SIZE) {
          const chunk = remaining.slice(index, index + CHUNK_SIZE);
          const isLastChunk = index + CHUNK_SIZE >= remaining.length;
          const chunkOk = await new Promise<boolean>((resolve) => {
            socket.emit(
              "uploadPlaylistChunk",
              {
                roomId: room.id,
                uploadId,
                items: chunk,
                isLast: isLastChunk,
              },
              (ack: Ack<{ receivedCount: number; totalCount: number }>) => {
                resolve(Boolean(ack?.ok));
              },
            );
          });
          if (!chunkOk) {
            setStatusText("同步播放清單失敗");
            return false;
          }
        }
      }

      return true;
    },
    [fetchCompletePlaylist, getSocket, setStatusText],
  );

  const handleUpdateRoomSettings = useCallback(
    async (payload: RoomSettingsPayload) => {
      const socket = getSocket();
      if (!socket || !currentRoom) {
        setStatusText("尚未加入房間");
        return false;
      }

      const normalizedPayload = {
        ...payload,
        ...(typeof payload.playDurationSec === "number"
          ? { playDurationSec: clampPlayDurationSec(payload.playDurationSec) }
          : {}),
        ...(typeof payload.revealDurationSec === "number"
          ? {
              revealDurationSec: clampRevealDurationSec(
                payload.revealDurationSec,
              ),
            }
          : {}),
        ...(typeof payload.startOffsetSec === "number"
          ? { startOffsetSec: clampStartOffsetSec(payload.startOffsetSec) }
          : {}),
        ...(typeof payload.allowCollectionClipTiming === "boolean"
          ? { allowCollectionClipTiming: payload.allowCollectionClipTiming }
          : {}),
        ...(typeof payload.allowParticipantInvite === "boolean"
          ? { allowParticipantInvite: payload.allowParticipantInvite }
          : {}),
      };

      return await new Promise<boolean>((resolve) => {
        socket.emit(
          "updateRoomSettings",
          { roomId: currentRoom.id, ...normalizedPayload },
          (ack: Ack<{ room: RoomSummary }>) => {
            if (!ack) {
              resolve(false);
              return;
            }
            if (!ack.ok) {
              setStatusText(formatAckError("更新房間設定失敗", ack.error));
              resolve(false);
              return;
            }

            const gameSettingsPatch = {
              ...(typeof normalizedPayload.playDurationSec === "number"
                ? { playDurationSec: normalizedPayload.playDurationSec }
                : {}),
              ...(typeof normalizedPayload.revealDurationSec === "number"
                ? { revealDurationSec: normalizedPayload.revealDurationSec }
                : {}),
              ...(typeof normalizedPayload.startOffsetSec === "number"
                ? { startOffsetSec: normalizedPayload.startOffsetSec }
                : {}),
              ...(typeof normalizedPayload.allowCollectionClipTiming ===
              "boolean"
                ? {
                    allowCollectionClipTiming:
                      normalizedPayload.allowCollectionClipTiming,
                  }
                : {}),
              ...(typeof normalizedPayload.allowParticipantInvite === "boolean"
                ? {
                    allowParticipantInvite:
                      normalizedPayload.allowParticipantInvite,
                  }
                : {}),
              ...(normalizedPayload.playbackExtensionMode
                ? {
                    playbackExtensionMode:
                      normalizedPayload.playbackExtensionMode,
                  }
                : {}),
            } satisfies Partial<RoomGameSettings>;

            const mergedRoom = mergeRoomSummaryIntoCurrentRoom(
              currentRoom,
              ack.data.room,
            );
            const patchedRoom = applyGameSettingsPatch(
              mergedRoom,
              gameSettingsPatch,
            );
            setCurrentRoom((previous) =>
              previous
                ? applyGameSettingsPatch(
                    mergeRoomSummaryIntoCurrentRoom(previous, ack.data.room),
                    gameSettingsPatch,
                  )
                : previous,
            );

            const nextPinInput =
              normalizedPayload.pin !== undefined
                ? normalizedPayload.pin
                : normalizedPayload.password;
            if (nextPinInput !== undefined) {
              const trimmed = nextPinInput?.trim() ?? "";
              const nextPassword = trimmed ? trimmed : null;
              saveRoomPassword(currentRoom.id, nextPassword);
              setHostRoomPassword(nextPassword);
            }

            const shouldSyncTiming =
              typeof normalizedPayload.playDurationSec === "number" ||
              typeof normalizedPayload.revealDurationSec === "number" ||
              typeof normalizedPayload.startOffsetSec === "number" ||
              typeof normalizedPayload.allowCollectionClipTiming === "boolean";

            if (!shouldSyncTiming) {
              setStatusText("房間設定已更新");
              resolve(true);
              return;
            }

            void (async () => {
              const synced = await syncRoomPlaylistTiming(
                patchedRoom,
                gameSettingsPatch,
              );
              setStatusText(
                synced
                  ? "房間設定已更新，播放清單已同步"
                  : "房間設定已更新，但播放清單同步失敗",
              );
              resolve(true);
            })();
          },
        );
      });
    },
    [
      currentRoom,
      getSocket,
      saveRoomPassword,
      setCurrentRoom,
      setHostRoomPassword,
      setStatusText,
      syncRoomPlaylistTiming,
    ],
  );

  return {
    handleUpdateRoomSettings,
    syncRoomPlaylistTiming,
  };
};

export default useRoomProviderSettingsActions;
