/**
 * RoomProvider — 薄組合層
 *
 * 把所有 sub-providers 巢狀組合，最後由 RoomContextAggregator 讀取全部
 * 專用 context 並重新組裝為向後相容的 RoomContext（供仍使用 useRoom() 的
 * 舊消費者過渡使用）。
 *
 * 新消費者應直接使用細粒度 hooks：
 *   useAuth() / useRoomSession() / useRoomGame() / useRoomPlaylist()
 *   useRoomCollections() / useRoomCreate()
 */
import { useMemo, type ReactNode } from "react";

import { useAuth } from "../../../shared/auth/AuthContext";
import { useRoomSession } from "./RoomSessionContext";
import { useRoomGame } from "./RoomGameContext";
import { useRoomCollections } from "./RoomCollectionsContext";
import { useRoomPlaylist } from "./RoomPlaylistContext";
import { useRoomCreate } from "./RoomCreateContext";
import { RoomContext, type RoomContextValue } from "./RoomContext";
import { QUESTION_MAX } from "./roomConstants";

import { RoomStatusSubProvider } from "./providers/RoomStatusSubProvider";
import { RoomAuthSubProvider } from "./providers/RoomAuthSubProvider";
import { RoomPlaylistSubProvider } from "./providers/RoomPlaylistSubProvider";
import { RoomCollectionsSubProvider } from "./providers/RoomCollectionsSubProvider";
import { RoomSessionCoreProvider } from "./providers/RoomSessionCoreProvider";
import { RoomCreateSubProvider } from "./providers/RoomCreateSubProvider";

// ─── Backward-compat aggregator ───────────────────────────────────────────────
// Reads from all specialised contexts and re-assembles the monolithic RoomContext
// so existing consumers of useRoom() continue to work without changes.

const RoomContextAggregator: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {
    authToken,
    authUser,
    authLoading,
    authExpired,
    refreshAuthToken,
    loginWithGoogle,
    logout,
    needsNicknameConfirm,
    nicknameDraft,
    setNicknameDraft,
    confirmNickname,
    isProfileEditorOpen,
    openProfileEditor,
    closeProfileEditor,
    clientId,
    username,
    displayUsername,
    usernameInput,
    setUsernameInput,
    handleSetUsername,
  } = useAuth();

  const {
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsError,
    collectionScope,
    publicCollectionsSort,
    setPublicCollectionsSort,
    collectionFavoriteUpdatingId,
    collectionsLastFetchedAt,
    selectedCollectionId,
    collectionItemsLoading,
    collectionItemsError,
    fetchCollections,
    loadMoreCollections,
    toggleCollectionFavorite,
    selectCollection,
    loadCollectionItems,
  } = useRoomCollections();

  const {
    playlistUrl,
    setPlaylistUrl,
    playlistItems,
    playlistError,
    playlistLoading,
    playlistStage,
    playlistLocked,
    playlistPreviewMeta,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    playlistViewItems,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
    playlistPageSize,
    playlistProgress,
    playlistSuggestions,
    loadMorePlaylist,
    questionCount,
    questionMin,
    questionStep,
    questionMaxLimit,
    updateQuestionCount,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    handleFetchPlaylistByUrl,
    handleFetchPlaylist,
    handleResetPlaylist,
    handleChangePlaylist,
    handleApplyPlaylistUrlDirect,
    handleApplyCollectionDirect,
    handleApplyYoutubePlaylistDirect,
    handleSuggestPlaylist,
    handleApplySuggestionSnapshot,
  } = useRoomPlaylist();

  const {
    currentRoom,
    currentRoomId,
    participants,
    messages,
    settlementHistory,
    statusText,
    setStatusText,
    kickedNotice,
    setKickedNotice,
    sessionProgress,
    isConnected,
    serverOffsetMs,
    syncServerOffset,
    hostRoomPassword,
    rooms,
    fetchRooms,
    fetchRoomById,
    inviteRoomId,
    inviteNotFound,
    isInviteMode,
    setInviteRoomId,
    routeRoomResolved,
    setRouteRoomId,
    handleLeaveRoom,
    handleKickPlayer,
    handleTransferHost,
    fetchSettlementHistorySummaries,
    fetchSettlementReplay,
  } = useRoomSession();

  const {
    gameState,
    gamePlaylist,
    isGameView,
    setIsGameView,
    playDurationSec,
    revealDurationSec,
    startOffsetSec,
    allowCollectionClipTiming,
    updatePlayDurationSec,
    updateRevealDurationSec,
    updateStartOffsetSec,
    updateAllowCollectionClipTiming,
    handleStartGame,
    handleSubmitChoice,
    handleRequestPlaybackExtensionVote,
    handleCastPlaybackExtensionVote,
    handleUpdateRoomSettings,
  } = useRoomGame();

  const {
    roomNameInput,
    setRoomNameInput,
    roomVisibilityInput,
    setRoomVisibilityInput,
    roomCreateSourceMode,
    setRoomCreateSourceMode,
    roomPasswordInput,
    setRoomPasswordInput,
    roomMaxPlayersInput,
    setRoomMaxPlayersInput,
    joinPasswordInput,
    setJoinPasswordInput,
    isCreatingRoom,
    handleCreateRoom,
    handleJoinRoom,
    resetCreateState,
  } = useRoomCreate();

  const value = useMemo<RoomContextValue>(
    () => ({
      // auth
      authToken,
      authUser,
      authLoading,
      authExpired,
      refreshAuthToken,
      loginWithGoogle,
      logout,
      needsNicknameConfirm,
      nicknameDraft,
      setNicknameDraft,
      confirmNickname,
      isProfileEditorOpen,
      openProfileEditor,
      closeProfileEditor,
      // identity
      clientId,
      username,
      displayUsername,
      usernameInput,
      setUsernameInput,
      handleSetUsername,
      // collections
      collections,
      collectionsLoading,
      collectionsLoadingMore,
      collectionsHasMore,
      collectionsError,
      collectionScope,
      publicCollectionsSort,
      setPublicCollectionsSort,
      collectionFavoriteUpdatingId,
      collectionsLastFetchedAt,
      selectedCollectionId,
      collectionItemsLoading,
      collectionItemsError,
      fetchCollections,
      loadMoreCollections,
      toggleCollectionFavorite,
      selectCollection,
      loadCollectionItems,
      // playlist
      playlistUrl,
      setPlaylistUrl,
      playlistItems,
      playlistError,
      playlistLoading,
      playlistStage,
      playlistLocked,
      playlistPreviewMeta,
      lastFetchedPlaylistId,
      lastFetchedPlaylistTitle,
      playlistViewItems,
      playlistHasMore,
      playlistLoadingMore,
      playlistPageCursor,
      playlistPageSize,
      playlistProgress,
      playlistSuggestions,
      loadMorePlaylist,
      questionCount,
      questionMin,
      questionMax: QUESTION_MAX,
      questionStep,
      questionMaxLimit,
      updateQuestionCount,
      youtubePlaylists,
      youtubePlaylistsLoading,
      youtubePlaylistsError,
      fetchYoutubePlaylists,
      importYoutubePlaylist,
      handleFetchPlaylistByUrl,
      handleFetchPlaylist,
      handleResetPlaylist,
      handleChangePlaylist,
      handleApplyPlaylistUrlDirect,
      handleApplyCollectionDirect,
      handleApplyYoutubePlaylistDirect,
      handleSuggestPlaylist,
      handleApplySuggestionSnapshot,
      // session
      currentRoom,
      currentRoomId,
      participants,
      messages,
      settlementHistory,
      statusText,
      setStatusText,
      kickedNotice,
      setKickedNotice,
      sessionProgress,
      isConnected,
      serverOffsetMs,
      syncServerOffset,
      hostRoomPassword,
      rooms,
      fetchRooms,
      fetchRoomById,
      inviteRoomId,
      inviteNotFound,
      isInviteMode,
      setInviteRoomId,
      routeRoomResolved,
      setRouteRoomId,
      handleLeaveRoom,
      handleKickPlayer,
      handleTransferHost,
      fetchSettlementHistorySummaries,
      fetchSettlementReplay,
      // game
      gameState,
      gamePlaylist,
      isGameView,
      setIsGameView,
      playDurationSec,
      revealDurationSec,
      startOffsetSec,
      allowCollectionClipTiming,
      updatePlayDurationSec,
      updateRevealDurationSec,
      updateStartOffsetSec,
      updateAllowCollectionClipTiming,
      handleStartGame,
      handleSubmitChoice,
      handleRequestPlaybackExtensionVote,
      handleCastPlaybackExtensionVote,
      handleUpdateRoomSettings,
      // create / join form
      roomNameInput,
      setRoomNameInput,
      roomVisibilityInput,
      setRoomVisibilityInput,
      roomCreateSourceMode,
      setRoomCreateSourceMode,
      roomPasswordInput,
      setRoomPasswordInput,
      roomMaxPlayersInput,
      setRoomMaxPlayersInput,
      joinPasswordInput,
      setJoinPasswordInput,
      isCreatingRoom,
      handleCreateRoom,
      handleJoinRoom,
      resetCreateState,
    }),
    [
      authToken, authUser, authLoading, authExpired, refreshAuthToken,
      loginWithGoogle, logout, needsNicknameConfirm, nicknameDraft,
      setNicknameDraft, confirmNickname, isProfileEditorOpen,
      openProfileEditor, closeProfileEditor,
      clientId, username, displayUsername, usernameInput, setUsernameInput,
      handleSetUsername,
      collections, collectionsLoading, collectionsLoadingMore,
      collectionsHasMore, collectionsError, collectionScope,
      publicCollectionsSort, setPublicCollectionsSort,
      collectionFavoriteUpdatingId, collectionsLastFetchedAt,
      selectedCollectionId, collectionItemsLoading, collectionItemsError,
      fetchCollections, loadMoreCollections, toggleCollectionFavorite,
      selectCollection, loadCollectionItems,
      playlistUrl, setPlaylistUrl, playlistItems, playlistError,
      playlistLoading, playlistStage, playlistLocked, playlistPreviewMeta,
      lastFetchedPlaylistId, lastFetchedPlaylistTitle, playlistViewItems,
      playlistHasMore, playlistLoadingMore, playlistPageCursor,
      playlistPageSize, playlistProgress, playlistSuggestions,
      loadMorePlaylist, questionCount, questionMin, questionStep,
      questionMaxLimit, updateQuestionCount, youtubePlaylists,
      youtubePlaylistsLoading, youtubePlaylistsError, fetchYoutubePlaylists,
      importYoutubePlaylist, handleFetchPlaylistByUrl, handleFetchPlaylist,
      handleResetPlaylist, handleChangePlaylist, handleApplyPlaylistUrlDirect,
      handleApplyCollectionDirect, handleApplyYoutubePlaylistDirect,
      handleSuggestPlaylist, handleApplySuggestionSnapshot,
      currentRoom, currentRoomId, participants, messages, settlementHistory,
      statusText, setStatusText, kickedNotice, setKickedNotice,
      sessionProgress, isConnected, serverOffsetMs, syncServerOffset,
      hostRoomPassword, rooms, fetchRooms, fetchRoomById,
      inviteRoomId, inviteNotFound, isInviteMode, setInviteRoomId,
      routeRoomResolved, setRouteRoomId, handleLeaveRoom, handleKickPlayer,
      handleTransferHost, fetchSettlementHistorySummaries, fetchSettlementReplay,
      gameState, gamePlaylist, isGameView, setIsGameView,
      playDurationSec, revealDurationSec, startOffsetSec, allowCollectionClipTiming,
      updatePlayDurationSec, updateRevealDurationSec, updateStartOffsetSec,
      updateAllowCollectionClipTiming, handleStartGame, handleSubmitChoice,
      handleRequestPlaybackExtensionVote, handleCastPlaybackExtensionVote,
      handleUpdateRoomSettings,
      roomNameInput, setRoomNameInput, roomVisibilityInput,
      setRoomVisibilityInput, roomCreateSourceMode, setRoomCreateSourceMode,
      roomPasswordInput, setRoomPasswordInput, roomMaxPlayersInput,
      setRoomMaxPlayersInput, joinPasswordInput, setJoinPasswordInput,
      isCreatingRoom, handleCreateRoom, handleJoinRoom, resetCreateState,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

// ─── Public export ────────────────────────────────────────────────────────────

export const RoomProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <RoomStatusSubProvider>
    <RoomAuthSubProvider>
      <RoomPlaylistSubProvider>
        <RoomCollectionsSubProvider>
          <RoomSessionCoreProvider>
            <RoomCreateSubProvider>
              <RoomContextAggregator>{children}</RoomContextAggregator>
            </RoomCreateSubProvider>
          </RoomSessionCoreProvider>
        </RoomCollectionsSubProvider>
      </RoomPlaylistSubProvider>
    </RoomAuthSubProvider>
  </RoomStatusSubProvider>
);
