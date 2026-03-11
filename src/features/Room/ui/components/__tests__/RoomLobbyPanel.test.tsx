// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChatMessage,
  PlaylistItem,
  PlaylistSuggestion,
  RoomParticipant,
  RoomState,
} from "../../../model/types";
import type { YoutubePlaylist } from "../../../model/RoomContext";
import type { CollectionOption } from "../roomLobbyPanelTypes";
import RoomLobbyPanel from "../RoomLobbyPanel";

vi.mock("../gameRoomPage/useMobileDrawerDragDismiss", () => ({
  default: () => ({
    dragHandleProps: {},
    paperStyle: {},
    isDragging: false,
  }),
}));

const currentRoom: RoomState["room"] = {
  id: "room-1",
  name: "測試房間",
  playerCount: 2,
  createdAt: 1,
  hasPassword: false,
  playlistCount: 12,
  hostClientId: "host-1",
  playlist: {
    items: [],
    totalCount: 12,
    receivedCount: 12,
    ready: true,
    pageSize: 50,
  },
  gameSettings: {
    questionCount: 5,
    revealDurationSec: 3,
    allowCollectionClipTiming: true,
  },
};

const participants: RoomParticipant[] = [
  {
    clientId: "host-1",
    username: "房主",
    joinedAt: 1,
    isOnline: true,
    lastSeen: 1,
    pingMs: 12,
    score: 0,
    combo: 0,
  },
  {
    clientId: "guest-1",
    username: "玩家",
    joinedAt: 2,
    isOnline: true,
    lastSeen: 2,
    pingMs: 18,
    score: 0,
    combo: 0,
  },
];

const messages: ChatMessage[] = [];
const playlistItems: PlaylistItem[] = [];
const playlistSuggestions: PlaylistSuggestion[] = [];
const collections: CollectionOption[] = [];
const youtubePlaylists: YoutubePlaylist[] = [];

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class ResizeObserverMock {
    observe() {}
    disconnect() {}
    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

describe("RoomLobbyPanel", () => {
  it("keeps start on the left, leave on the right, and removes the room history button", () => {
    render(
      <RoomLobbyPanel
        currentRoom={currentRoom}
        participants={participants}
        messages={messages}
        selfClientId="host-1"
        roomPassword={null}
        messageInput=""
        playlistItems={playlistItems}
        playlistHasMore={false}
        playlistLoadingMore={false}
        playlistProgress={{ received: 12, total: 12, ready: true }}
        playlistSuggestions={playlistSuggestions}
        playlistUrl=""
        playlistItemsForChange={playlistItems}
        playlistError={null}
        playlistLoading={false}
        collections={collections}
        collectionsLoading={false}
        collectionsError={null}
        selectedCollectionId={null}
        collectionItemsLoading={false}
        collectionItemsError={null}
        isGoogleAuthed
        youtubePlaylists={youtubePlaylists}
        youtubePlaylistsLoading={false}
        youtubePlaylistsError={null}
        isHost
        gameState={null}
        canStartGame
        hasLastSettlement
        latestSettlementRoundKey="round-2"
        onLeave={() => {}}
        onInputChange={() => {}}
        onSend={() => {}}
        onLoadMorePlaylist={() => {}}
        onStartGame={() => {}}
        onUpdateRoomSettings={async () => true}
        onOpenLastSettlement={() => {}}
        onOpenHistoryDrawer={() => {}}
        onOpenSettlementByRoundKey={() => {}}
        onOpenGame={() => {}}
        onInvite={async () => {}}
        onKickPlayer={() => {}}
        onTransferHost={() => {}}
        onSuggestPlaylist={async () => ({ ok: true })}
        onApplySuggestionSnapshot={async () => {}}
        onChangePlaylist={async () => {}}
        onPlaylistUrlChange={() => {}}
        onFetchPlaylistByUrl={() => {}}
        onFetchCollections={() => {}}
        onSelectCollection={() => {}}
        onLoadCollectionItems={async () => {}}
        onFetchYoutubePlaylists={() => {}}
        onImportYoutubePlaylist={async () => {}}
      />,
    );

    const toolbar = screen.getAllByRole("toolbar", { name: "房間操作" })[0];
    const previousButton = screen.getByRole("button", { name: "查看上一局" });
    const startButton = screen.getByRole("button", { name: "開始遊戲" });
    const settingsButton = screen.getByRole("button", { name: "開啟房主設定" });
    const toolbarButtons = within(toolbar).getAllByRole("button");

    expect(screen.queryByRole("button", { name: "對戰歷史" })).not.toBeInTheDocument();
    expect(toolbarButtons[0]).toBe(startButton);
    expect(toolbarButtons[toolbarButtons.length - 1]).toHaveTextContent("離開");
    expect(startButton.compareDocumentPosition(previousButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(settingsButton).toHaveClass("room-lobby-toolbar-settings-btn");
  });

  it("opens a confirmation dialog before leaving the room", () => {
    render(
      <RoomLobbyPanel
        currentRoom={currentRoom}
        participants={participants}
        messages={messages}
        selfClientId="host-1"
        roomPassword={null}
        messageInput=""
        playlistItems={playlistItems}
        playlistHasMore={false}
        playlistLoadingMore={false}
        playlistProgress={{ received: 12, total: 12, ready: true }}
        playlistSuggestions={playlistSuggestions}
        playlistUrl=""
        playlistItemsForChange={playlistItems}
        playlistError={null}
        playlistLoading={false}
        collections={collections}
        collectionsLoading={false}
        collectionsError={null}
        selectedCollectionId={null}
        collectionItemsLoading={false}
        collectionItemsError={null}
        isGoogleAuthed
        youtubePlaylists={youtubePlaylists}
        youtubePlaylistsLoading={false}
        youtubePlaylistsError={null}
        isHost
        gameState={null}
        canStartGame
        hasLastSettlement
        latestSettlementRoundKey="round-2"
        onLeave={() => {}}
        onInputChange={() => {}}
        onSend={() => {}}
        onLoadMorePlaylist={() => {}}
        onStartGame={() => {}}
        onUpdateRoomSettings={async () => true}
        onOpenLastSettlement={() => {}}
        onOpenHistoryDrawer={() => {}}
        onOpenSettlementByRoundKey={() => {}}
        onOpenGame={() => {}}
        onInvite={async () => {}}
        onKickPlayer={() => {}}
        onTransferHost={() => {}}
        onSuggestPlaylist={async () => ({ ok: true })}
        onApplySuggestionSnapshot={async () => {}}
        onChangePlaylist={async () => {}}
        onPlaylistUrlChange={() => {}}
        onFetchPlaylistByUrl={() => {}}
        onFetchCollections={() => {}}
        onSelectCollection={() => {}}
        onLoadCollectionItems={async () => {}}
        onFetchYoutubePlaylists={() => {}}
        onImportYoutubePlaylist={async () => {}}
      />,
    );

    const toolbar = screen.getAllByRole("toolbar", { name: "房間操作" })[0];
    fireEvent.click(within(toolbar).getAllByRole("button", { name: "離開" })[0]);

    expect(screen.getByText("要離開房間嗎？")).toBeInTheDocument();
  });
});
