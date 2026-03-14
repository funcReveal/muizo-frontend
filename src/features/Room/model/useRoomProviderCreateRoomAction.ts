import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { trackEvent } from "../../../shared/analytics/track";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import { apiFetchRooms } from "./roomApi";
import type { RoomCreateSourceMode } from "./RoomContext";
import {
  CHUNK_SIZE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PLAY_DURATION_SEC,
  DEFAULT_REVEAL_DURATION_SEC,
  DEFAULT_ROOM_MAX_PLAYERS,
  DEFAULT_START_OFFSET_SEC,
  PLAYER_MAX,
  PLAYER_MIN,
} from "./roomConstants";
import {
  applyGameSettingsPatch,
  buildUploadPlaylistItems,
  formatAckError,
  mergeRoomSummaryIntoCurrentRoom,
} from "./roomProviderUtils";
import {
  clampPlayDurationSec,
  clampQuestionCount,
  clampRevealDurationSec,
  clampStartOffsetSec,
  getQuestionMax,
} from "./roomUtils";
import type {
  Ack,
  ClientSocket,
  GameState,
  PlaylistItem,
  RoomParticipant,
  RoomState,
  RoomSummary,
} from "./types";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

interface UseRoomProviderCreateRoomActionParams {
  apiUrl: string;
  getSocket: () => ClientSocket | null;
  username: string | null;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  setStatusText: (value: string | null) => void;
  createRoomInFlightRef: MutableRefObject<boolean>;
  releaseCreateRoomLockRef: MutableRefObject<(() => void) | null>;
  setIsCreatingRoom: Dispatch<SetStateAction<boolean>>;
  roomNameInput: string;
  roomVisibilityInput: "public" | "private";
  roomCreateSourceMode: RoomCreateSourceMode;
  roomPasswordInput: string;
  roomMaxPlayersInput: string;
  questionCount: number;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  playlistItems: PlaylistItem[];
  lastFetchedPlaylistId: string | null;
  lastFetchedPlaylistTitle: string | null;
  clientId: string;
  fetchPlaylistPage: (
    roomId: string,
    page: number,
    pageSize?: number,
    opts?: { reset?: boolean },
  ) => void;
  lockSessionClientId: (nextClientId: string) => void;
  persistRoomId: (id: string | null) => void;
  seedPresenceParticipants: (
    roomId: string | null | undefined,
    nextParticipants: RoomParticipant[],
  ) => void;
  mergeCachedParticipantPing: (
    nextParticipants: RoomParticipant[],
    previousParticipants: RoomParticipant[],
  ) => RoomParticipant[];
  syncServerOffset: (serverNow: number) => void;
  saveRoomPassword: (roomId: string, password: string | null) => void;
  currentRoomIdRef: MutableRefObject<string | null>;
  setCurrentRoom: Dispatch<SetStateAction<RoomState["room"] | null>>;
  setParticipants: Dispatch<SetStateAction<RoomParticipant[]>>;
  setMessages: Dispatch<SetStateAction<RoomState["messages"]>>;
  setSettlementHistory: Dispatch<
    SetStateAction<RoomState["settlementHistory"]>
  >;
  setPlaylistProgress: Dispatch<SetStateAction<PlaylistProgressState>>;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setIsGameView: Dispatch<SetStateAction<boolean>>;
  setGamePlaylist: Dispatch<SetStateAction<PlaylistItem[]>>;
  setRooms: Dispatch<SetStateAction<RoomSummary[]>>;
  setHostRoomPassword: Dispatch<SetStateAction<string | null>>;
  setRoomNameInput: Dispatch<SetStateAction<string>>;
  setRoomMaxPlayersInput: Dispatch<SetStateAction<string>>;
}

export const useRoomProviderCreateRoomAction = ({
  apiUrl,
  getSocket,
  username,
  authToken,
  refreshAuthToken,
  setStatusText,
  createRoomInFlightRef,
  releaseCreateRoomLockRef,
  setIsCreatingRoom,
  roomNameInput,
  roomVisibilityInput,
  roomCreateSourceMode,
  roomPasswordInput,
  roomMaxPlayersInput,
  questionCount,
  playDurationSec,
  revealDurationSec,
  startOffsetSec,
  allowCollectionClipTiming,
  playlistItems,
  lastFetchedPlaylistId,
  lastFetchedPlaylistTitle,
  clientId,
  fetchPlaylistPage,
  lockSessionClientId,
  persistRoomId,
  seedPresenceParticipants,
  mergeCachedParticipantPing,
  syncServerOffset,
  saveRoomPassword,
  currentRoomIdRef,
  setCurrentRoom,
  setParticipants,
  setMessages,
  setSettlementHistory,
  setPlaylistProgress,
  setGameState,
  setIsGameView,
  setGamePlaylist,
  setRooms,
  setHostRoomPassword,
  setRoomNameInput,
  setRoomMaxPlayersInput,
}: UseRoomProviderCreateRoomActionParams) => {
  const getDefaultRoomName = (nextUsername: string | null) =>
    nextUsername ? `${nextUsername}'s room` : "新房間";

  const handleCreateRoom = useCallback(async () => {
    const socket = getSocket();
    if (!socket || !username) {
      setStatusText("嚙罵嚙踝蕭嚙稽嚙緩嚙誕用者名嚙踝蕭");
      return;
    }
    if (createRoomInFlightRef.current) {
      setStatusText("嚙請塚蕭嚙諍立歹蕭嚙璀嚙請稍嚙踝蕭");
      return;
    }
    createRoomInFlightRef.current = true;
    setIsCreatingRoom(true);
    setStatusText("嚙諍立房塚蕭嚙踝蕭嚙皺");
    const releaseCreateRoomLock = () => {
      createRoomInFlightRef.current = false;
      setIsCreatingRoom(false);
      releaseCreateRoomLockRef.current = null;
    };
    releaseCreateRoomLockRef.current = releaseCreateRoomLock;
    if (authToken) {
      const token = await ensureFreshAuthToken({
        token: authToken,
        refreshAuthToken,
      });
      if (!token) {
        setStatusText("嚙緯嚙皚嚙緩嚙盤嚙踝蕭嚙璀嚙請哨蕭嚙編嚙緯嚙皚");
        releaseCreateRoomLock();
        return;
      }
    }
    const trimmed = roomNameInput.trim();
    const trimmedPin = roomPasswordInput.trim();
    const trimmedMaxPlayers = roomMaxPlayersInput.trim();
    if (!trimmed) {
      setStatusText("嚙請選蕭J嚙請塚蕭嚙磕嚙踝蕭");
      releaseCreateRoomLock();
      return;
    }
    if (playlistItems.length === 0 || !lastFetchedPlaylistId) {
      setStatusText("嚙請伐蕭嚙踝蕭嚙皚嚙踝蕭嚙踝蕭M嚙踝蕭");
      releaseCreateRoomLock();
      return;
    }
    if (trimmedMaxPlayers && !/^\d+$/.test(trimmedMaxPlayers)) {
      setStatusText("最大玩家數必須是數字");
      releaseCreateRoomLock();
      return;
    }
    const desiredMaxPlayers = trimmedMaxPlayers
      ? Number(trimmedMaxPlayers)
      : DEFAULT_ROOM_MAX_PLAYERS;
    if (desiredMaxPlayers < PLAYER_MIN || desiredMaxPlayers > PLAYER_MAX) {
      setStatusText(
        `嚙瘡嚙複哨蕭嚙踝蕭搕嚙踝蕭嚙?${PLAYER_MIN} 嚙踝蕭 ${PLAYER_MAX} 嚙瘡`,
      );
      releaseCreateRoomLock();
      return;
    }
    const desiredVisibility = roomVisibilityInput;
    if (trimmedPin && !/^\d{4}$/.test(trimmedPin)) {
      setStatusText("PIN 需為 4 位數字。");
      releaseCreateRoomLock();
      return;
    }
    const desiredPin = trimmedPin || null;
    const nextQuestionCount = clampQuestionCount(
      questionCount,
      getQuestionMax(playlistItems.length),
    );
    const nextPlayDurationSec = clampPlayDurationSec(playDurationSec);
    const nextRevealDurationSec = clampRevealDurationSec(revealDurationSec);
    const nextStartOffsetSec = clampStartOffsetSec(startOffsetSec);
    const nextAllowCollectionClipTiming = Boolean(allowCollectionClipTiming);
    trackEvent("room_create_click", {
      source_mode: roomCreateSourceMode,
      room_visibility: desiredVisibility,
      player_limit: desiredMaxPlayers,
      question_count: nextQuestionCount,
      reveal_duration_sec: nextRevealDurationSec,
      playlist_count: playlistItems.length,
    });
    const shouldSyncRoomSettings =
      desiredVisibility !== "public" ||
      desiredPin !== null ||
      desiredMaxPlayers !== DEFAULT_ROOM_MAX_PLAYERS ||
      nextPlayDurationSec !== DEFAULT_PLAY_DURATION_SEC ||
      nextRevealDurationSec !== DEFAULT_REVEAL_DURATION_SEC ||
      nextStartOffsetSec !== DEFAULT_START_OFFSET_SEC ||
      !nextAllowCollectionClipTiming;

    const uploadId =
      crypto.randomUUID?.() ??
      `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const uploadItems = buildUploadPlaylistItems(playlistItems, {
      playDurationSec: nextPlayDurationSec,
      startOffsetSec: nextStartOffsetSec,
      allowCollectionClipTiming: nextAllowCollectionClipTiming,
    });
    const firstChunk = uploadItems.slice(0, CHUNK_SIZE);
    const remaining = uploadItems.slice(CHUNK_SIZE);
    const isLast = remaining.length === 0;

    const payload = {
      roomName: trimmed,
      username,
      pin: desiredPin ?? undefined,
      visibility: desiredVisibility,
      maxPlayers: desiredMaxPlayers,
      gameSettings: {
        questionCount: nextQuestionCount,
        playDurationSec: nextPlayDurationSec,
        revealDurationSec: nextRevealDurationSec,
        startOffsetSec: nextStartOffsetSec,
        allowCollectionClipTiming: nextAllowCollectionClipTiming,
      },
      playlist: {
        uploadId,
        id: lastFetchedPlaylistId,
        title: lastFetchedPlaylistTitle ?? undefined,
        totalCount: uploadItems.length,
        items: firstChunk,
        isLast,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    };
    const createStartedAt = Date.now();

    let createResolved = false;
    let createFinalized = false;
    const finalizeCreate = () => {
      if (createFinalized) return;
      createFinalized = true;
      releaseCreateRoomLock();
    };

    const applyJoinedStateForCreatedRoom = (state: RoomState) => {
      syncServerOffset(state.serverNow);
      setCurrentRoom(
        applyGameSettingsPatch(state.room, {
          questionCount: nextQuestionCount,
          playDurationSec: nextPlayDurationSec,
          revealDurationSec: nextRevealDurationSec,
          startOffsetSec: nextStartOffsetSec,
          allowCollectionClipTiming: nextAllowCollectionClipTiming,
        }),
      );
      setParticipants((prev) =>
        mergeCachedParticipantPing(state.participants, prev),
      );
      seedPresenceParticipants(state.room.id, state.participants);
      setMessages(state.messages);
      setSettlementHistory(state.settlementHistory ?? []);
      persistRoomId(state.room.id);
      lockSessionClientId(clientId);
      setPlaylistProgress({
        received: state.room.playlist.receivedCount,
        total: state.room.playlist.totalCount,
        ready: state.room.playlist.ready,
      });
      setGameState(state.gameState ?? null);
      setIsGameView(false);
      setGamePlaylist([]);
      fetchPlaylistPage(state.room.id, 1, state.room.playlist.pageSize, {
        reset: true,
      });
    };

    const uploadRemainingPlaylistChunks = async (roomId: string) => {
      if (remaining.length === 0) return;
      for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
        const chunk = remaining.slice(i, i + CHUNK_SIZE);
        const isLastChunk = i + CHUNK_SIZE >= remaining.length;
        await new Promise<void>((resolve) => {
          let settled = false;
          const ackTimeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve();
          }, 4_000);
          socket.emit(
            "uploadPlaylistChunk",
            {
              roomId,
              uploadId,
              items: chunk,
              isLast: isLastChunk,
            },
            () => {
              if (settled) return;
              settled = true;
              window.clearTimeout(ackTimeout);
              resolve();
            },
          );
        });
      }
    };

    const continueUploadRemainingPlaylistChunks = (roomId: string) => {
      if (remaining.length === 0) return;
      void uploadRemainingPlaylistChunks(roomId).catch((error) => {
        console.error(error);
        if (currentRoomIdRef.current === roomId) {
          setStatusText(
            "嚙緩嚙箠嚙皚嚙請塚蕭嚙璀嚙踝蕭嚙諸餘嚙緬嚙踝蕭P嚙畿嚙踝蕭嚙踝蕭",
          );
        }
      });
    };

    const tryRecoverCreatedRoomFromList = async () => {
      if (createResolved || !createRoomInFlightRef.current) return false;
      if (currentRoomIdRef.current) {
        createResolved = true;
        finalizeCreate();
        return true;
      }
      if (!apiUrl) return false;
      try {
        const { ok, payload } = await apiFetchRooms(apiUrl);
        if (!ok) return false;
        const nextRooms = ((payload?.rooms ?? payload) as RoomSummary[]) ?? [];
        if (Array.isArray(nextRooms)) {
          setRooms(nextRooms);
        }
        if (currentRoomIdRef.current) {
          createResolved = true;
          finalizeCreate();
          return true;
        }
        const createdWindowStart = createStartedAt - 30_000;
        const createdWindowEnd = Date.now() + 5_000;
        const candidate = nextRooms
          .filter((room) => {
            if ((room.name ?? "").trim() !== trimmed) return false;
            if ((room.hasPin ?? room.hasPassword) !== Boolean(desiredPin)) return false;
            if (
              typeof room.playlistCount === "number" &&
              room.playlistCount > 0 &&
              room.playlistCount !== uploadItems.length
            ) {
              return false;
            }
            if (
              typeof room.gameSettings?.questionCount === "number" &&
              room.gameSettings.questionCount !== nextQuestionCount
            ) {
              return false;
            }
            if (
              room.visibility &&
              (room.visibility === "public" || room.visibility === "private") &&
              room.visibility !== desiredVisibility
            ) {
              return false;
            }
            if (
              room.maxPlayers !== undefined &&
              (room.maxPlayers ?? null) !== desiredMaxPlayers
            ) {
              return false;
            }
            if (
              typeof room.createdAt === "number" &&
              (room.createdAt < createdWindowStart ||
                room.createdAt > createdWindowEnd)
            ) {
              return false;
            }
            return true;
          })
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (!candidate) return false;

        const tryJoinCandidate = async () =>
          await new Promise<boolean>((resolve) => {
            socket.emit(
              "joinRoom",
                {
                  roomCode: candidate.roomCode,
                  username,
                  pin: desiredPin ?? undefined,
                },
              async (joinAck: Ack<RoomState>) => {
                if (!joinAck?.ok) {
                  resolve(false);
                  return;
                }
                createResolved = true;
                const state = joinAck.data;
                applyJoinedStateForCreatedRoom(state);
                saveRoomPassword(state.room.id, desiredPin);
                setHostRoomPassword(desiredPin);
                setRoomNameInput(getDefaultRoomName(username));
                setRoomMaxPlayersInput(String(DEFAULT_ROOM_MAX_PLAYERS));
                setStatusText(
                  `嚙諍立回嚙踝蕭嚙踝蕭嚙踝蕭A嚙緩嚙諛動進嚙皚嚙瘦${state.room.name}`,
                );
                finalizeCreate();
                continueUploadRemainingPlaylistChunks(state.room.id);
                resolve(true);
              },
            );
          });

        const retryIntervalsMs = [0, 350, 800];
        for (
          let joinAttempt = 0;
          joinAttempt < retryIntervalsMs.length;
          joinAttempt += 1
        ) {
          if (createResolved || !createRoomInFlightRef.current) return false;
          if (joinAttempt === 0) {
            setStatusText("嚙諍立佗蕭嚙穀嚙璀嚙踝蕭嚙箭嚙箠嚙皚嚙請塚蕭嚙皺");
          } else {
            setStatusText(
              `嚙請塚蕭嚙緩嚙諍立，嚙踝蕭嚙箭嚙踝蕭嚙編嚙踝蕭嚙調進嚙皚嚙稽${joinAttempt + 1}/${retryIntervalsMs.length}嚙稷嚙皺`,
            );
            await new Promise<void>((resolve) =>
              window.setTimeout(resolve, retryIntervalsMs[joinAttempt]),
            );
            if (createResolved || !createRoomInFlightRef.current) return false;
          }

          const recovered = await tryJoinCandidate();
          if (recovered) return true;
        }

        return false;
      } catch (error) {
        console.error(error);
        return false;
      }
    };

    const submitCreateRoom = (attempt: 0 | 1) => {
      const timeoutMs = attempt === 0 ? 4_000 : 6_000;
      const ackTimeout = window.setTimeout(() => {
        if (createResolved || !createRoomInFlightRef.current) return;
        if (attempt === 0) {
          setStatusText(
            "嚙諍立房塚蕭嚙稷嚙踝蕭嚙踝蕭嚙踝蕭A嚙踝蕭嚙箭嚙踝蕭嚙調自動進嚙皚嚙皺",
          );
          void tryRecoverCreatedRoomFromList().then((recovered) => {
            if (recovered || createResolved || !createRoomInFlightRef.current) {
              return;
            }
            setStatusText(
              "嚙諍立房塚蕭嚙瞌嚙褕，嚙踝蕭嚙箭嚙瞑嚙畿嚙皚嚙踝蕭嚙請塚蕭嚙皺",
            );
            submitCreateRoom(1);
          });
          return;
        }
        setStatusText(
          "嚙諍立房塚蕭嚙踝蕭嚙踝蕭嚙稷嚙踝蕭嚙璀嚙諒恬蕭A嚙踝蕭嚙調自動進嚙皚嚙皺",
        );
        void tryRecoverCreatedRoomFromList().then((recovered) => {
          if (recovered || createResolved || !createRoomInFlightRef.current) {
            return;
          }
          setStatusText("嚙諍立房塚蕭嚙瞌嚙褕，嚙請稍嚙賦重嚙踝蕭");
          finalizeCreate();
        });
      }, timeoutMs);

      socket.emit("createRoom", payload, async (ack: Ack<RoomState>) => {
        window.clearTimeout(ackTimeout);
        if (createResolved) return;
        if (!ack) {
          if (attempt === 0) {
            setStatusText(
              "嚙諍立房塚蕭嚙稷嚙踝蕭嚙踩失，嚙踝蕭嚙箭嚙瞑嚙畿嚙皚嚙踝蕭嚙請塚蕭嚙皺",
            );
            submitCreateRoom(1);
            return;
          }
          setStatusText(
            "嚙諍立房塚蕭嚙踝蕭嚙諸：嚙踝蕭嚙璀嚙踝蕭嚙盤嚙稷嚙踝蕭",
          );
          finalizeCreate();
          return;
        }
        if (!ack.ok) {
          setStatusText(formatAckError("嚙諍立房塚蕭嚙踝蕭嚙踝蕭", ack.error));
          finalizeCreate();
          return;
        }

        createResolved = true;
        const state = ack.data;
        applyJoinedStateForCreatedRoom(state);
        let accessSettingsWarning: string | null = null;
        if (shouldSyncRoomSettings) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const settingsAckTimeout = window.setTimeout(() => {
              if (settled) return;
              settled = true;
              accessSettingsWarning = "嚙請塚蕭嚙緞嚙踝蕭嚙瞑嚙畿嚙瞌嚙踝蕭";
              resolve();
            }, 4_000);
            socket.emit(
              "updateRoomSettings",
              {
                roomId: state.room.id,
                visibility: desiredVisibility,
                pin: desiredPin,
                questionCount: nextQuestionCount,
                playDurationSec: nextPlayDurationSec,
                startOffsetSec: nextStartOffsetSec,
                allowCollectionClipTiming: nextAllowCollectionClipTiming,
                maxPlayers: desiredMaxPlayers,
              },
              (settingsAck: Ack<{ room: RoomSummary }>) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(settingsAckTimeout);
                if (!settingsAck) {
                  accessSettingsWarning =
                    "嚙請塚蕭嚙緞嚙踝蕭嚙瞑嚙畿嚙瞌嚙踝蕭";
                  resolve();
                  return;
                }
                if (!settingsAck.ok) {
                  accessSettingsWarning = formatAckError(
                    "嚙請塚蕭嚙緞嚙踝蕭嚙瞑嚙畿嚙踝蕭嚙踝蕭",
                    settingsAck.error,
                  );
                  resolve();
                  return;
                }
                setCurrentRoom((prev) =>
                  prev
                    ? applyGameSettingsPatch(
                        mergeRoomSummaryIntoCurrentRoom(
                          prev,
                          settingsAck.data.room,
                        ),
                        {
                          playDurationSec: nextPlayDurationSec,
                          revealDurationSec: nextRevealDurationSec,
                          startOffsetSec: nextStartOffsetSec,
                          allowCollectionClipTiming:
                            nextAllowCollectionClipTiming,
                        },
                      )
                    : prev,
                );
                resolve();
              },
            );
          });
        }
        saveRoomPassword(state.room.id, desiredPin);
        setHostRoomPassword(desiredPin);
        setRoomNameInput(getDefaultRoomName(username));
        setRoomMaxPlayersInput(String(DEFAULT_ROOM_MAX_PLAYERS));
        trackEvent("room_create_success", {
          room_id: state.room.id,
          source_mode: roomCreateSourceMode,
          room_visibility: desiredVisibility,
          player_limit: desiredMaxPlayers,
          question_count: nextQuestionCount,
          playlist_count: uploadItems.length,
        });
        setStatusText(
          accessSettingsWarning
            ? `${accessSettingsWarning}嚙稽嚙請塚蕭嚙緩嚙諍立：${state.room.name}嚙稷`
            : `嚙緩嚙諍立房塚蕭嚙瘦${state.room.name}`,
        );
        finalizeCreate();
        continueUploadRemainingPlaylistChunks(state.room.id);
      });
    };

    submitCreateRoom(0);
  }, [
    allowCollectionClipTiming,
    authToken,
    clientId,
    createRoomInFlightRef,
    currentRoomIdRef,
    fetchPlaylistPage,
    getSocket,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    lockSessionClientId,
    mergeCachedParticipantPing,
    persistRoomId,
    playDurationSec,
    playlistItems,
    questionCount,
    refreshAuthToken,
    releaseCreateRoomLockRef,
    revealDurationSec,
    roomCreateSourceMode,
    roomMaxPlayersInput,
    roomNameInput,
    roomPasswordInput,
    roomVisibilityInput,
    saveRoomPassword,
    seedPresenceParticipants,
    setCurrentRoom,
    setGamePlaylist,
    setGameState,
    setHostRoomPassword,
    setIsCreatingRoom,
    setIsGameView,
    setMessages,
    setParticipants,
    setPlaylistProgress,
    setRooms,
    setRoomMaxPlayersInput,
    setRoomNameInput,
    setSettlementHistory,
    setStatusText,
    startOffsetSec,
    syncServerOffset,
    username,
    apiUrl,
  ]);

  return { handleCreateRoom };
};

export default useRoomProviderCreateRoomAction;
