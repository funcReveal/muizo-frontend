// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChatMessage,
  PlaylistItem,
  PlaylistSuggestion,
  RoomParticipant,
  RoomState,
} from "../../model/types";
import type { YoutubePlaylist } from "../../model/RoomContext";
import type { CollectionOption } from "../lib/roomLobbyPanelTypes";
import RoomLobbyPanel from "../components/lobby/RoomLobbyPanel";

vi.mock("../gameRoomPage/useMobileDrawerDragDismiss", () => ({
  default: () => ({
    dragHandleProps: {},
    paperStyle: {},
    isDragging: false,
  }),
}));

const createMatchMedia = (matches = false) =>
  vi.fn().mockImplementation((query: string) => ({
    matches:
      typeof matches === "boolean"
        ? matches
        : query.includes("(max-width:1024px)") || query.includes("(max-width:640px)"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const currentRoom: RoomState["room"] = {
  id: "room-1",
  name: "測試房間",
  playerCount: 2,
  createdAt: 1,
  hasPassword: false,
  playlistCount: 12,
  hostClientId: "host-1",
  roomCode: "ABCD1234",
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
    username: "玩家一",
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

const baseProps = {
  currentRoom,
  participants,
  messages,
  roomPassword: null,
  playlistItems,
  playlistHasMore: false,
  playlistLoadingMore: false,
  playlistProgress: { received: 12, total: 12, ready: true },
  playlistSuggestions,
  playlistUrl: "",
  playlistItemsForChange: playlistItems,
  playlistError: null,
  playlistLoading: false,
  collections,
  collectionsLoading: false,
  collectionsError: null,
  selectedCollectionId: null,
  collectionItemsLoading: false,
  collectionItemsError: null,
  isGoogleAuthed: true,
  youtubePlaylists,
  youtubePlaylistsLoading: false,
  youtubePlaylistsError: null,
  canStartGame: true,
  hasLastSettlement: true,
  latestSettlementRoundKey: "round-2",
  onLeave: () => {},
  onLoadMorePlaylist: () => {},
  onStartGame: () => {},
  onUpdateRoomSettings: async () => true,
  onOpenLastSettlement: () => {},
  onOpenHistoryDrawer: () => {},
  onOpenSettlementByRoundKey: () => {},
  onOpenGame: () => {},
  onKickPlayer: () => {},
  onTransferHost: () => {},
  onSuggestPlaylist: async () => ({ ok: true }),
  onApplySuggestionSnapshot: async () => {},
  onChangePlaylist: async () => {},
  onPlaylistUrlChange: () => {},
  onFetchPlaylistByUrl: () => {},
  onFetchCollections: () => {},
  onSelectCollection: () => {},
  onLoadCollectionItems: async () => {},
  onFetchYoutubePlaylists: () => {},
  onImportYoutubePlaylist: async () => {},
};

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: createMatchMedia(false),
  });

  class ResizeObserverMock {
    observe() {}
    disconnect() {}
    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

describe("RoomLobbyPanel", () => {
  it("keeps primary actions in order and uses battle info instead of previous round button", () => {
    render(
      <RoomLobbyPanel
        {...baseProps}
        selfClientId="host-1"
        isHost
        gameState={null}
      />,
    );

    const toolbar = screen.getAllByRole("toolbar", { name: "房間操作" })[0];
    const toolbarButtons = within(toolbar).getAllByRole("button");
    const battleInfoButton = screen.getByRole("button", { name: "對戰資訊" });
    const startButton = screen.getByRole("button", { name: "開始遊戲" });
    const settingsButton = screen.getByRole("button", { name: "開啟房主設定" });
    const leaveButton = screen.getByRole("button", { name: "離開房間" });

    expect(
      screen.queryByRole("button", { name: "上一局" }),
    ).not.toBeInTheDocument();
    expect(toolbarButtons[0]).toBe(startButton);
    expect(toolbarButtons[toolbarButtons.length - 1]).toBe(leaveButton);
    expect(startButton.compareDocumentPosition(battleInfoButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(settingsButton).toHaveClass("room-lobby-toolbar-settings-btn");
  });

  it("opens a confirmation dialog before leaving the room", () => {
    render(
      <RoomLobbyPanel
        {...baseProps}
        selfClientId="host-1"
        isHost
        gameState={null}
      />,
    );

    const toolbar = screen.getAllByRole("toolbar", { name: "房間操作" })[0];
    fireEvent.click(within(toolbar).getByRole("button", { name: "離開房間" }));

    expect(screen.getByText("要離開房間嗎？")).toBeInTheDocument();
  });

  it("hides host-only settings action on mobile for non-host players", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches:
          query.includes("(max-width:1024px)") ||
          query.includes("(max-width:640px)"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <RoomLobbyPanel
        {...baseProps}
        selfClientId="guest-1"
        isHost={false}
        gameState={null}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "設定" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "離開" })).toBeInTheDocument();
  });
});
