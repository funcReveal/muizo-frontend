import {
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { trackEvent } from "../../../shared/analytics/track";
import { ensureFreshAuthToken } from "../../../shared/auth/token";
import type { RoomCreateSourceMode } from "./RoomCreateContext";
import {
  CHUNK_SIZE,
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  DEFAULT_ROOM_MAX_PLAYERS,
  PLAYER_MAX,
  PLAYER_MIN,
  QUESTION_MIN,
} from "./roomConstants";
import {
  applyGameSettingsPatch,
  buildUploadPlaylistItems,
  formatAckError,
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
  PlaylistSourceType,
  RoomParticipant,
  RoomState,
  RoomSummary,
} from "./types";

type PlaylistProgressState = {
  received: number;
  total: number;
  ready: boolean;
};

type RoomCreationState =
  | "drafting"
  | "uploading"
  | "verifying"
  | "finalizing"
  | "ready"
  | "failed"
  | "aborted";

type BeginRoomCreationPayload = {
  roomMeta: {
    name: string;
    visibility: "public" | "private";
    pin?: string | null;
    maxPlayers: number | null;
  };
  gameSettings: {
    questionCount: number;
    playDurationSec: number;
    revealDurationSec: number;
    startOffsetSec: number;
    allowCollectionClipTiming: boolean;
    allowParticipantInvite: boolean;
    playbackExtensionMode: "manual_vote" | "auto_once" | "disabled";
  };
  playlistManifest: {
    sourceType?: PlaylistSourceType | null;
    sourceId?: string | null;
    title?: string | null;
    totalCount: number;
    chunkCount: number;
    playlistHash: string;
  };
};

type BeginRoomCreationResult = {
  creationId: string;
  uploadSessionId: string;
  state: "uploading";
  expiresAt: number;
};

type UploadRoomCreationChunkPayload = {
  creationId: string;
  uploadSessionId: string;
  chunkIndex: number;
  chunkCount: number;
  chunkHash: string;
  items: PlaylistItem[];
};

type UploadRoomCreationChunkResult = {
  creationId: string;
  state: "uploading" | "verifying";
  receivedChunkCount: number;
  expectedChunkCount: number;
  receivedItemsCount: number;
  totalCount: number;
};

type FinalizeRoomCreationPayload = {
  creationId: string;
  uploadSessionId: string;
};

type FinalizeRoomCreationResult = {
  creationId: string;
  state: RoomCreationState;
  roomId?: string;
  roomState?: RoomState;
  roomSessionToken?: string;
};

type AbortRoomCreationPayload = {
  creationId: string;
};

type AbortRoomCreationResult = {
  creationId: string;
  state: "aborted";
};

interface UseRoomProviderCreateRoomActionParams {
  apiUrl: string;
  getSocket: () => ClientSocket | null;
  username: string | null;
  authToken: string | null;
  refreshAuthToken: () => Promise<string | null>;
  setStatusText: (value: string | null) => void;
  createRoomInFlightRef: RefObject<boolean>;
  releaseCreateRoomLockRef: RefObject<(() => void) | null>;
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
  persistRoomSessionToken: (token: string | null) => void;
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
  currentRoomIdRef: RefObject<string | null>;
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
  resetPlaylistState: () => void;
}

type UnsafeSocketEmit = (
  event: string,
  payload: unknown,
  callback: (ack: Ack<unknown>) => void,
) => void;

const asUnsafeEmit = (socket: ClientSocket): UnsafeSocketEmit =>
  (socket as unknown as { emit: UnsafeSocketEmit }).emit.bind(socket);

const ROOM_CREATION_ACK_TIMEOUT_MS = 20_000;

const computeStableHash = async (value: unknown) => {
  const text = JSON.stringify(value);
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const emitAck = <T>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<Ack<T>> =>
  new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        ok: false,
        error: "Room creation request timed out. Please retry.",
      });
    }, ROOM_CREATION_ACK_TIMEOUT_MS);

    asUnsafeEmit(socket)(event, payload, (ack) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ack as Ack<T>);
    });
  });

export const useRoomProviderCreateRoomAction = ({
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
  fetchPlaylistPage,
  lockSessionClientId,
  persistRoomId,
  persistRoomSessionToken,
  seedPresenceParticipants,
  mergeCachedParticipantPing,
  syncServerOffset,
  saveRoomPassword,
  setCurrentRoom,
  setParticipants,
  setMessages,
  setSettlementHistory,
  setPlaylistProgress,
  setGameState,
  setIsGameView,
  setGamePlaylist,
  setHostRoomPassword,
  setRoomNameInput,
  setRoomMaxPlayersInput,
  resetPlaylistState,
}: UseRoomProviderCreateRoomActionParams) => {
  const questionMin = QUESTION_MIN;

  const resolvePlaylistSourceType = (
    sourceMode: RoomCreateSourceMode,
  ): PlaylistSourceType => {
    switch (sourceMode) {
      case "publicCollection":
        return "public_collection";
      case "privateCollection":
        return "private_collection";
      case "youtube":
        return "youtube_google_import";
      case "link":
      default:
        return "youtube_pasted_link";
    }
  };

  const getDefaultRoomName = (nextUsername: string | null) =>
    nextUsername ? `${nextUsername}'s room` : "新房間";

  const runWithTimeout = useCallback(
    async <T>(task: Promise<T>, timeoutMs: number, fallback: T) => {
      let timer: number | null = null;
      try {
        return await Promise.race<T>([
          task,
          new Promise<T>((resolve) => {
            timer = window.setTimeout(() => resolve(fallback), timeoutMs);
          }),
        ]);
      } finally {
        if (timer !== null) {
          window.clearTimeout(timer);
        }
      }
    },
    [],
  );

  const handleCreateRoom = useCallback(async () => {
    const socket = getSocket();
    if (!socket || !username) {
      setStatusText("請先設定使用者名稱");
      return;
    }

    if (createRoomInFlightRef.current) {
      setStatusText("正在建立房間，請稍候。");
      return;
    }

    createRoomInFlightRef.current = true;
    setIsCreatingRoom(true);
    setStatusText(null);

    const releaseCreateRoomLock = () => {
      createRoomInFlightRef.current = false;
      setIsCreatingRoom(false);
      releaseCreateRoomLockRef.current = null;
    };

    releaseCreateRoomLockRef.current = releaseCreateRoomLock;

    const finalizeCreate = () => {
      releaseCreateRoomLock();
    };

    if (authToken) {
      const token = await runWithTimeout(
        ensureFreshAuthToken({
          token: authToken,
          refreshAuthToken,
        }),
        5_000,
        null,
      );

      if (!token) {
        setStatusText("登入狀態已失效，請重新登入。");
        finalizeCreate();
        return;
      }
    }

    const trimmed = roomNameInput.trim();
    const trimmedPin = roomPasswordInput.trim();
    const trimmedMaxPlayers = roomMaxPlayersInput.trim();

    if (!trimmed) {
      setStatusText("請先輸入房間名稱。");
      finalizeCreate();
      return;
    }

    if (playlistItems.length === 0) {
      setStatusText("請先準備題庫內容，才能建立房間。");
      finalizeCreate();
      return;
    }

    if (playlistItems.length < questionMin) {
      setStatusText(`題庫至少需要 ${questionMin} 題，才能建立房間。`);
      finalizeCreate();
      return;
    }

    if (trimmedMaxPlayers && !/^\d+$/.test(trimmedMaxPlayers)) {
      setStatusText("最大玩家數必須是數字");
      finalizeCreate();
      return;
    }

    const desiredMaxPlayers = trimmedMaxPlayers
      ? Number(trimmedMaxPlayers)
      : DEFAULT_ROOM_MAX_PLAYERS;

    if (desiredMaxPlayers < PLAYER_MIN || desiredMaxPlayers > PLAYER_MAX) {
      setStatusText(`最大人數需介於 ${PLAYER_MIN} - ${PLAYER_MAX} 人之間`);
      finalizeCreate();
      return;
    }

    if (trimmedPin && !/^\d{4}$/.test(trimmedPin)) {
      setStatusText("PIN 需為 4 位數字。");
      finalizeCreate();
      return;
    }

    const desiredVisibility = roomVisibilityInput;
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

    const uploadItems = buildUploadPlaylistItems(playlistItems, {
      playDurationSec: nextPlayDurationSec,
      startOffsetSec: nextStartOffsetSec,
      allowCollectionClipTiming: nextAllowCollectionClipTiming,
    });

    const chunkCount = Math.ceil(uploadItems.length / CHUNK_SIZE);
    const playlistHash = await computeStableHash(uploadItems);

    const beginPayload: BeginRoomCreationPayload = {
      roomMeta: {
        name: trimmed,
        visibility: desiredVisibility,
        pin: desiredPin,
        maxPlayers: desiredMaxPlayers,
      },
      gameSettings: {
        questionCount: nextQuestionCount,
        playDurationSec: nextPlayDurationSec,
        revealDurationSec: nextRevealDurationSec,
        startOffsetSec: nextStartOffsetSec,
        allowCollectionClipTiming: nextAllowCollectionClipTiming,
        allowParticipantInvite: false,
        playbackExtensionMode: DEFAULT_PLAYBACK_EXTENSION_MODE,
      },
      playlistManifest: {
        sourceType: resolvePlaylistSourceType(roomCreateSourceMode),
        sourceId: lastFetchedPlaylistId,
        title: lastFetchedPlaylistTitle ?? null,
        totalCount: uploadItems.length,
        chunkCount,
        playlistHash,
      },
    };

    let creationId: string | null = null;

    const abortCreation = async () => {
      if (!creationId) return;
      try {
        await emitAck<AbortRoomCreationResult>(socket, "abortRoomCreation", {
          creationId,
        } satisfies AbortRoomCreationPayload);
      } catch (error) {
        console.error(error);
      }
    };

    const beginAck = await emitAck<BeginRoomCreationResult>(
      socket,
      "beginRoomCreation",
      beginPayload,
    );

    if (!beginAck.ok) {
      setStatusText(formatAckError("建立房間失敗", beginAck.error));
      finalizeCreate();
      return;
    }

    creationId = beginAck.data.creationId;
    const uploadSessionId = beginAck.data.uploadSessionId;

    setPlaylistProgress({
      received: 0,
      total: uploadItems.length,
      ready: false,
    });
    setStatusText(`正在同步題庫到房間（0/${uploadItems.length}）...`);

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const chunkItems = uploadItems.slice(
        chunkIndex * CHUNK_SIZE,
        (chunkIndex + 1) * CHUNK_SIZE,
      );
      const chunkHash = await computeStableHash(chunkItems);

      const uploadAck = await emitAck<UploadRoomCreationChunkResult>(
        socket,
        "uploadRoomCreationChunk",
        {
          creationId,
          uploadSessionId,
          chunkIndex,
          chunkCount,
          chunkHash,
          items: chunkItems,
        } satisfies UploadRoomCreationChunkPayload,
      );

      if (!uploadAck.ok) {
        await abortCreation();
        setStatusText(formatAckError("建立房間失敗", uploadAck.error));
        finalizeCreate();
        return;
      }

      setPlaylistProgress({
        received: uploadAck.data.receivedItemsCount,
        total: uploadAck.data.totalCount,
        ready: false,
      });

      setStatusText(
        `正在同步題庫到房間（${uploadAck.data.receivedItemsCount}/${uploadAck.data.totalCount}）...`,
      );
    }

    setStatusText("正在完成房間建立...");

    const finalizeAck = await emitAck<FinalizeRoomCreationResult>(
      socket,
      "finalizeRoomCreation",
      {
        creationId,
        uploadSessionId,
      } satisfies FinalizeRoomCreationPayload,
    );

    if (
      !finalizeAck.ok ||
      !finalizeAck.data.roomState ||
      !finalizeAck.data.roomId
    ) {
      await abortCreation();
      setStatusText(
        formatAckError(
          "建立房間失敗",
          finalizeAck.ok ? "Missing finalized room state" : finalizeAck.error,
        ),
      );
      finalizeCreate();
      return;
    }

    const finalizedState = finalizeAck.data.roomState;
    const finalizedRoom = applyGameSettingsPatch(finalizedState.room, {
      questionCount: nextQuestionCount,
      playDurationSec: nextPlayDurationSec,
      revealDurationSec: nextRevealDurationSec,
      startOffsetSec: nextStartOffsetSec,
      allowCollectionClipTiming: nextAllowCollectionClipTiming,
      playbackExtensionMode: DEFAULT_PLAYBACK_EXTENSION_MODE,
    });

    syncServerOffset(finalizedState.serverNow);
    setCurrentRoom(finalizedRoom);
    setParticipants((prev) =>
      mergeCachedParticipantPing(finalizedState.participants, prev),
    );
    seedPresenceParticipants(
      finalizedState.room.id,
      finalizedState.participants,
    );
    setMessages(finalizedState.messages);
    setSettlementHistory(finalizedState.settlementHistory ?? []);
    persistRoomSessionToken(finalizeAck.data.roomSessionToken ?? null);
    persistRoomId(finalizeAck.data.roomId);
    lockSessionClientId(finalizedState.selfClientId);

    setPlaylistProgress({
      received: finalizedState.room.playlist.totalCount,
      total: finalizedState.room.playlist.totalCount,
      ready: true,
    });

    setGameState(finalizedState.gameState ?? null);
    setIsGameView(false);
    setGamePlaylist([]);
    fetchPlaylistPage(
      finalizedState.room.id,
      1,
      finalizedState.room.playlist.pageSize,
      { reset: true },
    );

    saveRoomPassword(finalizedState.room.id, desiredPin);
    setHostRoomPassword(desiredPin);
    setRoomNameInput(getDefaultRoomName(username));
    setRoomMaxPlayersInput(String(DEFAULT_ROOM_MAX_PLAYERS));
    resetPlaylistState();

    trackEvent("room_create_success", {
      room_id: finalizeAck.data.roomId,
      source_mode: roomCreateSourceMode,
      room_visibility: desiredVisibility,
      player_limit: desiredMaxPlayers,
      question_count: nextQuestionCount,
      playlist_count: uploadItems.length,
    });

    setStatusText(null);
    finalizeCreate();
  }, [
    allowCollectionClipTiming,
    authToken,
    createRoomInFlightRef,
    fetchPlaylistPage,
    getSocket,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    lockSessionClientId,
    mergeCachedParticipantPing,
    persistRoomId,
    persistRoomSessionToken,
    playDurationSec,
    playlistItems,
    questionCount,
    questionMin,
    refreshAuthToken,
    releaseCreateRoomLockRef,
    revealDurationSec,
    resetPlaylistState,
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
    setRoomMaxPlayersInput,
    setRoomNameInput,
    setSettlementHistory,
    setStatusText,
    startOffsetSec,
    syncServerOffset,
    username,
    runWithTimeout,
  ]);

  return { handleCreateRoom };
};

export default useRoomProviderCreateRoomAction;
