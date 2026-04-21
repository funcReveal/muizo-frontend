import type { Ack, ClientSocket } from "@features/RoomSession";
import type { PlaylistItem, PlaylistSourceType } from "@features/PlaylistSource";

import {
  computeStableHash,
  emitRoomCreationAck,
  ROOM_CREATION_ACK_TIMEOUT_MS,
} from "./roomCreationUtils";
import type {
  AbortRoomCreationPayload,
  AbortRoomCreationResult,
  BeginRoomCreationPayload,
  BeginRoomCreationResult,
  FinalizeRoomCreationPayload,
  FinalizeRoomCreationResult,
  UploadRoomCreationChunkPayload,
  UploadRoomCreationChunkResult,
} from "./roomCreation.types";

type RoomCreationFlowProgress = {
  received: number;
  total: number;
  ready: boolean;
};

export type RunRoomCreationFlowParams = {
  socket: ClientSocket;
  roomMeta: BeginRoomCreationPayload["roomMeta"];
  gameSettings: BeginRoomCreationPayload["gameSettings"];
  playlist: {
    items: PlaylistItem[];
    chunkSize: number;
    sourceType?: PlaylistSourceType | null;
    sourceId?: string | null;
    title?: string | null;
  };
  onUploadStart?: (progress: RoomCreationFlowProgress) => void;
  onChunkUploaded?: (progress: RoomCreationFlowProgress) => void;
  onFinalizing?: () => void;
};

export const runRoomCreationFlow = async ({
  socket,
  roomMeta,
  gameSettings,
  playlist,
  onUploadStart,
  onChunkUploaded,
  onFinalizing,
}: RunRoomCreationFlowParams): Promise<Ack<FinalizeRoomCreationResult>> => {
  const { items, chunkSize, sourceType, sourceId, title } = playlist;
  const chunkCount = Math.ceil(items.length / chunkSize);
  const playlistHash = await computeStableHash(items);

  const beginPayload: BeginRoomCreationPayload = {
    roomMeta,
    gameSettings,
    playlistManifest: {
      sourceType,
      sourceId,
      title,
      totalCount: items.length,
      chunkCount,
      playlistHash,
    },
  };

  let creationId: string | null = null;

  const abortCreation = async () => {
    if (!creationId) return;
    try {
      await emitRoomCreationAck<AbortRoomCreationResult>(
        socket,
        "abortRoomCreation",
        {
          creationId,
        } satisfies AbortRoomCreationPayload,
      );
    } catch (error) {
      console.error(error);
    }
  };

  const beginAck = await emitRoomCreationAck<BeginRoomCreationResult>(
    socket,
    "beginRoomCreation",
    beginPayload,
  );

  if (!beginAck.ok) {
    return beginAck;
  }

  creationId = beginAck.data.creationId;
  const activeCreationId = creationId;
  const uploadSessionId = beginAck.data.uploadSessionId;

  onUploadStart?.({
    received: 0,
    total: items.length,
    ready: false,
  });

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const chunkItems = items.slice(
      chunkIndex * chunkSize,
      (chunkIndex + 1) * chunkSize,
    );
    const chunkHash = await computeStableHash(chunkItems);

    const uploadAck = await emitRoomCreationAck<UploadRoomCreationChunkResult>(
      socket,
      "uploadRoomCreationChunk",
      {
        creationId: activeCreationId,
        uploadSessionId,
        chunkIndex,
        chunkCount,
        chunkHash,
        items: chunkItems,
      } satisfies UploadRoomCreationChunkPayload,
    );

    if (!uploadAck.ok) {
      await abortCreation();
      return uploadAck;
    }

    onChunkUploaded?.({
      received: uploadAck.data.receivedItemsCount,
      total: uploadAck.data.totalCount,
      ready: false,
    });
  }

  onFinalizing?.();

  const finalizeAck = await emitRoomCreationAck<FinalizeRoomCreationResult>(
    socket,
    "finalizeRoomCreation",
    {
      creationId: activeCreationId,
      uploadSessionId,
    } satisfies FinalizeRoomCreationPayload,
  );

  if (!finalizeAck.ok || !finalizeAck.data.roomState || !finalizeAck.data.roomId) {
    await abortCreation();
  }

  return finalizeAck;
};

export {
  computeStableHash,
  emitRoomCreationAck,
  ROOM_CREATION_ACK_TIMEOUT_MS,
};
export type {
  AbortRoomCreationPayload,
  AbortRoomCreationResult,
  BeginRoomCreationPayload,
  BeginRoomCreationResult,
  FinalizeRoomCreationPayload,
  FinalizeRoomCreationResult,
  RoomCreationState,
  UploadRoomCreationChunkPayload,
  UploadRoomCreationChunkResult,
} from "./roomCreation.types";
