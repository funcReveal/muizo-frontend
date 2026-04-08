/**
 * RoomPlaylistSubProvider
 *
 * Owns playlist source state for the room lobby.
 * It exposes the base RoomPlaylistContext plus smaller bridge contexts that
 * other room providers use to patch in socket-driven behavior.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../../../../shared/auth/AuthContext";
import {
  RoomPlaylistContext,
  type RoomPlaylistContextValue,
} from "../RoomPlaylistContext";
import { useRoomPlaylist as useRoomPlaylistHook } from "../useRoomPlaylist";
import { useRoomPlaylistSnapshots } from "../useRoomPlaylistSnapshots";
import { useRoomProviderPlaylistPaging } from "../useRoomProviderPlaylistPaging";
import { extractVideoIdFromUrl } from "../roomProviderUtils";
import { setStoredQuestionCount } from "../roomStorage";
import { API_URL, QUESTION_MAX } from "../roomConstants";
import { useStatusWrite } from "./RoomStatusContexts";
import {
  PlaylistInputControlContext,
  PlaylistLiveSettersContext,
  PlaylistSocketBridgeContext,
  type PlaylistInputControlContextValue,
  type PlaylistLiveSettersContextValue,
  type PlaylistSocketBridgeContextValue,
} from "./RoomPlaylistSubContexts";
import type { ClientSocket, PlaylistSuggestion } from "../types";

export const RoomPlaylistSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { authToken, refreshAuthToken } = useAuth();
  const { setStatusText } = useStatusWrite();

  const [playlistProgress, setPlaylistProgress] = useState<{
    received: number;
    total: number;
    ready: boolean;
  }>({ received: 0, total: 0, ready: false });
  const [playlistSuggestions, setPlaylistSuggestions] = useState<
    PlaylistSuggestion[]
  >([]);

  const getSocketRef = useRef<() => ClientSocket | null>(() => null);
  const loadMorePlaylistRef = useRef<() => void>(() => {});
  const onResetCollectionRef = useRef<() => void>(() => {});

  const getSocket = useCallback(() => getSocketRef.current(), []);

  const handlePlaylistCollectionReset = useCallback(() => {
    onResetCollectionRef.current();
  }, []);

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
    questionCount,
    questionMin,
    questionMaxLimit,
    questionStep,
    updateQuestionCount,
    handleFetchPlaylist,
    handleResetPlaylist,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    applyPlaylistSource,
    clearPlaylistError,
    resetPlaylistState,
    resetYoutubePlaylists,
  } = useRoomPlaylistHook({
    apiUrl: API_URL,
    authToken,
    refreshAuthToken,
    setStatusText,
    onResetCollection: handlePlaylistCollectionReset,
  });

  const { fetchYoutubeSnapshot, fetchPublicPlaylistSnapshot } =
    useRoomPlaylistSnapshots({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
      youtubePlaylists,
      extractVideoIdFromUrl,
    });

  const handleUpdateQuestionCount = useCallback(
    (value: number) => {
      const clamped = updateQuestionCount(value);
      setStoredQuestionCount(clamped);
    },
    [updateQuestionCount],
  );

  const handlePlaylistPagePayload = useCallback(
    (payload: { totalCount: number; ready: boolean }) => {
      setPlaylistProgress((prev) => ({
        ...prev,
        total: payload.totalCount,
        ready: payload.ready,
      }));
    },
    [],
  );

  const {
    playlistViewItems,
    playlistHasMore,
    playlistLoadingMore,
    playlistPageCursor,
    playlistPageSize,
    setPlaylistViewItems,
    setPlaylistHasMore,
    setPlaylistLoadingMore,
    resetPlaylistPagingState,
    fetchPlaylistPage,
    fetchCompletePlaylist,
  } = useRoomProviderPlaylistPaging({
    getSocket,
    onPagePayload: handlePlaylistPagePayload,
  });

  const prevAuthTokenRef = useRef(authToken);
  useEffect(() => {
    if (prevAuthTokenRef.current === authToken) return;
    prevAuthTokenRef.current = authToken;
    if (!authToken) {
      resetYoutubePlaylists();
      resetPlaylistState();
    }
  }, [authToken, resetPlaylistState, resetYoutubePlaylists]);

  const loadMorePlaylist = useCallback(() => loadMorePlaylistRef.current(), []);

  const noop = useCallback(async () => {}, []);
  const noopBool = useCallback(async () => false as const, []);
  const noopSuggest = useCallback(async () => ({ ok: false as const }), []);

  const playlistContextValue = useMemo<RoomPlaylistContextValue>(
    () => ({
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
      updateQuestionCount: handleUpdateQuestionCount,
      youtubePlaylists,
      youtubePlaylistsLoading,
      youtubePlaylistsError,
      fetchYoutubePlaylists,
      importYoutubePlaylist,
      handleFetchPlaylistByUrl: noop as RoomPlaylistContextValue["handleFetchPlaylistByUrl"],
      handleFetchPlaylist,
      handleResetPlaylist,
      handleChangePlaylist: noop as RoomPlaylistContextValue["handleChangePlaylist"],
      handleApplyPlaylistUrlDirect: noopBool,
      handleApplyCollectionDirect: noopBool,
      handleApplyYoutubePlaylistDirect: noopBool,
      handleSuggestPlaylist: noopSuggest as RoomPlaylistContextValue["handleSuggestPlaylist"],
      handleApplySuggestionSnapshot: noop as RoomPlaylistContextValue["handleApplySuggestionSnapshot"],
    }),
    [
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
      handleUpdateQuestionCount,
      youtubePlaylists,
      youtubePlaylistsLoading,
      youtubePlaylistsError,
      fetchYoutubePlaylists,
      importYoutubePlaylist,
      handleFetchPlaylist,
      handleResetPlaylist,
      noop,
      noopBool,
      noopSuggest,
    ],
  );

  const liveSettersValue = useMemo<PlaylistLiveSettersContextValue>(
    () => ({
      setPlaylistViewItems,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      setPlaylistProgress,
      setPlaylistSuggestions,
      resetPlaylistPagingState,
      playlistPageSize,
      fetchPlaylistPage,
      fetchCompletePlaylist,
    }),
    [
      setPlaylistViewItems,
      setPlaylistHasMore,
      setPlaylistLoadingMore,
      resetPlaylistPagingState,
      playlistPageSize,
      fetchPlaylistPage,
      fetchCompletePlaylist,
    ],
  );

  const inputControlValue = useMemo<PlaylistInputControlContextValue>(
    () => ({
      applyPlaylistSource,
      clearPlaylistError,
      setPlaylistUrl,
      resetPlaylistState,
      fetchYoutubeSnapshot,
      fetchPublicPlaylistSnapshot,
    }),
    [
      applyPlaylistSource,
      clearPlaylistError,
      setPlaylistUrl,
      resetPlaylistState,
      fetchYoutubeSnapshot,
      fetchPublicPlaylistSnapshot,
    ],
  );

  const bridgeValue = useMemo<PlaylistSocketBridgeContextValue>(
    () => ({ getSocketRef, loadMorePlaylistRef, onResetCollectionRef }),
    [],
  );

  return (
    <RoomPlaylistContext.Provider value={playlistContextValue}>
      <PlaylistLiveSettersContext.Provider value={liveSettersValue}>
        <PlaylistInputControlContext.Provider value={inputControlValue}>
          <PlaylistSocketBridgeContext.Provider value={bridgeValue}>
            {children}
          </PlaylistSocketBridgeContext.Provider>
        </PlaylistInputControlContext.Provider>
      </PlaylistLiveSettersContext.Provider>
    </RoomPlaylistContext.Provider>
  );
};
