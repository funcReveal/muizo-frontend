// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { YoutubePlaylist } from "../../../model/RoomContext";
import type { PlaylistSuggestion } from "../../../model/types";
import type { CollectionOption } from "../roomLobbyPanelTypes";
import RoomLobbyHostControls from "../RoomLobbyHostControls";

const suggestions: PlaylistSuggestion[] = [
  {
    clientId: "client-a",
    username: "Alice",
    type: "playlist",
    value: "https://youtube.com/playlist?list=123",
    suggestedAt: 1,
    title: "City Pop",
    totalCount: 12,
  },
];

const collections: CollectionOption[] = [
  {
    id: "col-1",
    title: "\u71b1\u9580\u6536\u85cf",
    visibility: "public",
    use_count: 18,
  },
];

const youtubePlaylists: YoutubePlaylist[] = [
  {
    id: "yt-1",
    title: "Synthwave",
    itemCount: 20,
  },
];

const HostControlsHarness = ({
  gameStatus,
  playlistItemsForChangeLength = 0,
}: {
  gameStatus?: "playing" | "ended";
  playlistItemsForChangeLength?: number;
}) => {
  const [hostSourceType, setHostSourceType] = useState<
    "suggestions" | "playlist" | "collection" | "youtube"
  >("suggestions");
  const [collectionScope, setCollectionScope] = useState<"public" | "owner">(
    "public",
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    null,
  );
  const [selectedYoutubePlaylistId, setSelectedYoutubePlaylistId] = useState<
    string | null
  >(null);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");

  return (
    <RoomLobbyHostControls
      isHostPanelExpanded
      hasNewSuggestions
      playlistSuggestions={suggestions}
      gameStatus={gameStatus}
      hostSourceType={hostSourceType}
      setHostSourceType={setHostSourceType}
      markSuggestionsSeen={() => {}}
      isApplyingHostSuggestion={false}
      hostSuggestionHint=""
      selectedSuggestionKey={selectedSuggestionKey}
      setSelectedSuggestionKey={setSelectedSuggestionKey}
      requestApplyHostSuggestion={() => {}}
      hostPlaylistPrimaryText=""
      playlistUrl={playlistUrl}
      onPlaylistUrlChange={setPlaylistUrl}
      onPlaylistPaste={() => {}}
      isGoogleAuthed
      collectionScope={collectionScope}
      setCollectionScope={setCollectionScope}
      onSelectCollection={setSelectedCollectionId}
      selectedCollectionId={selectedCollectionId}
      collections={collections}
      collectionsLoading={false}
      collectionItemsLoading={false}
      isHostCollectionEmptyNotice={false}
      hostCollectionPrimaryText=""
      visibleCollectionsError={null}
      collectionItemsError={null}
      onLoadCollectionItems={async () => {}}
      isHostYoutubeEmptyNotice={false}
      isHostYoutubeMissingNotice={false}
      hostYoutubePrimaryText=""
      visibleHostYoutubeError={null}
      youtubePlaylists={youtubePlaylists}
      youtubePlaylistsLoading={false}
      selectedYoutubePlaylistId={selectedYoutubePlaylistId}
      setSelectedYoutubePlaylistId={setSelectedYoutubePlaylistId}
      onImportYoutubePlaylist={async () => {}}
      openConfirmModal={(_, __, action) => action()}
      playlistLoadNotice={null}
      playlistError={null}
      playlistItemsForChangeLength={playlistItemsForChangeLength}
      playlistLoading={false}
      onChangePlaylist={async () => {}}
    />
  );
};

describe("RoomLobbyHostControls", () => {
  afterEach(() => {
    cleanup();
  });

  it("switches between compact source pills and only shows one active source view", () => {
    render(<HostControlsHarness />);

    expect(screen.getAllByText("\u63a8\u85a6\u64ad\u653e\u6e05\u55ae")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u63a8\u85a6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u9023\u7d50" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "\u9023\u7d50" }));

    expect(
      screen.getByPlaceholderText("\u8cbc\u4e0a YouTube URL"),
    ).toBeInTheDocument();
  });

  it("keeps source actions disabled while the game is playing", () => {
    render(
      <HostControlsHarness gameStatus="playing" playlistItemsForChangeLength={2} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "\u9023\u7d50" }));

    expect(
      screen.getByPlaceholderText("\u8cbc\u4e0a YouTube URL"),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "\u5957\u7528\u5230\u623f\u9593" }),
    ).toBeDisabled();
  });
});
