// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import type { Ack, ClientSocket, RoomState } from "@features/RoomSession";
import type { PlaylistItem } from "@features/PlaylistSource";
import type {
  BeginRoomCreationResult,
  FinalizeRoomCreationResult,
  UploadRoomCreationChunkResult,
} from "../roomCreation.types";
import { runRoomCreationFlow } from "../useRoomCreationFlow";

type SocketCall = {
  event: string;
  payload: unknown;
};

type AckMap = Record<string, Ack<unknown> | Ack<unknown>[]>;

const roomMeta = {
  name: "Test room",
  visibility: "public" as const,
  pin: null,
  maxPlayers: 8,
};

const gameSettings = {
  questionCount: 5,
  playDurationSec: 15,
  revealDurationSec: 5,
  startOffsetSec: 0,
  allowCollectionClipTiming: true,
  allowParticipantInvite: false,
  playbackExtensionMode: "manual_vote" as const,
};

const playlistItems: PlaylistItem[] = [
  { title: "Track 1", url: "https://example.test/1" },
  { title: "Track 2", url: "https://example.test/2" },
  { title: "Track 3", url: "https://example.test/3" },
];

const finalizedRoomState = {
  room: {
    id: "room-1",
    roomCode: "ABC123",
    name: "Test room",
    playerCount: 1,
    createdAt: 1,
    hasPassword: false,
    playlistCount: 3,
    hostClientId: "host-1",
    playlist: {
      items: [],
      totalCount: 3,
      receivedCount: 3,
      ready: true,
      pageSize: 50,
    },
  },
  selfClientId: "host-1",
  participants: [],
  messages: [],
  settlementHistory: [],
  serverNow: 123,
} satisfies RoomState;

const createSocket = (acks: AckMap) => {
  const calls: SocketCall[] = [];

  const socket = {
    emit: vi.fn((event: string, payload: unknown, callback: (ack: Ack<unknown>) => void) => {
      calls.push({ event, payload });
      const nextAck = acks[event];
      if (Array.isArray(nextAck)) {
        const ack = nextAck.shift();
        if (!ack) {
          throw new Error(`Missing ack for ${event}`);
        }
        callback(ack);
        return;
      }
      if (!nextAck) {
        throw new Error(`Missing ack for ${event}`);
      }
      callback(nextAck);
    }),
  } as unknown as ClientSocket;

  return { socket, calls };
};

describe("runRoomCreationFlow", () => {
  it("begins, uploads chunks, reports progress, and finalizes", async () => {
    const beginAck: Ack<BeginRoomCreationResult> = {
      ok: true,
      data: {
        creationId: "creation-1",
        uploadSessionId: "upload-1",
        state: "uploading",
        expiresAt: 999,
      },
    };
    const finalizeAck: Ack<FinalizeRoomCreationResult> = {
      ok: true,
      data: {
        creationId: "creation-1",
        state: "ready",
        roomId: "room-1",
        roomState: finalizedRoomState,
        roomSessionToken: "token-1",
      },
    };
    const { socket, calls } = createSocket({
      beginRoomCreation: beginAck,
      uploadRoomCreationChunk: [
        {
          ok: true,
          data: {
            creationId: "creation-1",
            state: "uploading",
            receivedChunkCount: 1,
            expectedChunkCount: 2,
            receivedItemsCount: 2,
            totalCount: 3,
          } satisfies UploadRoomCreationChunkResult,
        },
        {
          ok: true,
          data: {
            creationId: "creation-1",
            state: "verifying",
            receivedChunkCount: 2,
            expectedChunkCount: 2,
            receivedItemsCount: 3,
            totalCount: 3,
          } satisfies UploadRoomCreationChunkResult,
        },
      ],
      finalizeRoomCreation: finalizeAck,
    });
    const onUploadStart = vi.fn();
    const onChunkUploaded = vi.fn();
    const onFinalizing = vi.fn();

    const result = await runRoomCreationFlow({
      socket,
      roomMeta,
      gameSettings,
      playlist: {
        items: playlistItems,
        chunkSize: 2,
        sourceType: "youtube_pasted_link",
        sourceId: "playlist-1",
        title: "Playlist",
      },
      onUploadStart,
      onChunkUploaded,
      onFinalizing,
    });

    expect(result).toEqual(finalizeAck);
    expect(calls.map((call) => call.event)).toEqual([
      "beginRoomCreation",
      "uploadRoomCreationChunk",
      "uploadRoomCreationChunk",
      "finalizeRoomCreation",
    ]);
    expect(calls[0]?.payload).toMatchObject({
      roomMeta,
      gameSettings,
      playlistManifest: {
        sourceType: "youtube_pasted_link",
        sourceId: "playlist-1",
        title: "Playlist",
        totalCount: 3,
        chunkCount: 2,
      },
    });
    expect(calls[1]?.payload).toMatchObject({
      creationId: "creation-1",
      uploadSessionId: "upload-1",
      chunkIndex: 0,
      chunkCount: 2,
      items: playlistItems.slice(0, 2),
    });
    expect(calls[2]?.payload).toMatchObject({
      creationId: "creation-1",
      uploadSessionId: "upload-1",
      chunkIndex: 1,
      chunkCount: 2,
      items: playlistItems.slice(2),
    });
    expect(onUploadStart).toHaveBeenCalledWith({
      received: 0,
      total: 3,
      ready: false,
    });
    expect(onChunkUploaded).toHaveBeenNthCalledWith(1, {
      received: 2,
      total: 3,
      ready: false,
    });
    expect(onChunkUploaded).toHaveBeenNthCalledWith(2, {
      received: 3,
      total: 3,
      ready: false,
    });
    expect(onFinalizing).toHaveBeenCalledTimes(1);
  });

  it("aborts and returns the upload error when a chunk upload fails", async () => {
    const uploadError: Ack<UploadRoomCreationChunkResult> = {
      ok: false,
      error: "Upload failed",
    };
    const { socket, calls } = createSocket({
      beginRoomCreation: {
        ok: true,
        data: {
          creationId: "creation-1",
          uploadSessionId: "upload-1",
          state: "uploading",
          expiresAt: 999,
        } satisfies BeginRoomCreationResult,
      },
      uploadRoomCreationChunk: uploadError,
      abortRoomCreation: {
        ok: true,
        data: {
          creationId: "creation-1",
          state: "aborted",
        },
      },
    });

    const result = await runRoomCreationFlow({
      socket,
      roomMeta,
      gameSettings,
      playlist: {
        items: playlistItems,
        chunkSize: 2,
      },
    });

    expect(result).toEqual(uploadError);
    expect(calls.map((call) => call.event)).toEqual([
      "beginRoomCreation",
      "uploadRoomCreationChunk",
      "abortRoomCreation",
    ]);
    expect(calls[2]?.payload).toEqual({ creationId: "creation-1" });
  });

  it("returns the begin error without uploading or aborting", async () => {
    const beginError: Ack<BeginRoomCreationResult> = {
      ok: false,
      error: "Begin failed",
    };
    const { socket, calls } = createSocket({
      beginRoomCreation: beginError,
    });

    const result = await runRoomCreationFlow({
      socket,
      roomMeta,
      gameSettings,
      playlist: {
        items: playlistItems,
        chunkSize: 2,
      },
    });

    expect(result).toEqual(beginError);
    expect(calls.map((call) => call.event)).toEqual(["beginRoomCreation"]);
  });
});
