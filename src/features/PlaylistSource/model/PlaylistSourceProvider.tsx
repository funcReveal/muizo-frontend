/**
 * PlaylistSourceProvider
 *
 * Owns playlist source/import state shared by room and collection flows.
 * It also exposes bridge contexts that room providers use to patch in
 * socket-driven behavior.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../../../shared/auth/AuthContext";
import {
  PlaylistSourceContext,
  type PlaylistSourceContextValue,
} from "./PlaylistSourceContext";
import { usePlaylistSourceState } from "./usePlaylistSourceState";
import { usePlaylistSourceSnapshots } from "./usePlaylistSourceSnapshots";
import { usePlaylistSourcePaging } from "./usePlaylistSourcePaging";
import { extractVideoIdFromUrl } from "./playlistSourceUtils";
import { setStoredQuestionCount } from "./playlistSourceStorage";
import {
  API_URL,
  QUESTION_MAX,
} from "@domain/room/constants";
import {
  PlaylistInputControlContext,
  PlaylistLiveSettersContext,
  PlaylistSocketBridgeContext,
  type PlaylistInputControlContextValue,
  type PlaylistLiveSettersContextValue,
  type PlaylistSocketBridgeContextValue,
  type PlaylistSourceAck,
  type PlaylistSourceSocket,
} from "./PlaylistSourceSubContexts";
import type {
  PlaylistSuggestion,
} from "./types";

type PlaylistSourceProviderProps = {
  children: ReactNode;
  setStatusText?: (value: string | null) => void;
};

export const PlaylistSourceProvider: React.FC<PlaylistSourceProviderProps> = ({
  children,
  setStatusText = () => {},
}) => {
  const { authToken, refreshAuthToken } = useAuth();

  const [playlistProgress, setPlaylistProgress] = useState<{
    received: number;
    total: number;
    ready: boolean;
  }>({ received: 0, total: 0, ready: false });
  const [playlistSuggestions, setPlaylistSuggestions] = useState<
    PlaylistSuggestion[]
  >([]);

  const getSocketRef = useRef<() => PlaylistSourceSocket | null>(() => null);
  const loadMorePlaylistRef = useRef<() => void>(() => {});
  const onResetCollectionRef = useRef<() => void>(() => {});
  const handleTerminalRoomAckRef = useRef(
    (() => false) as (
      roomId: string | null | undefined,
      ack: PlaylistSourceAck<unknown> | null | undefined,
    ) => boolean,
  );

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
  } = usePlaylistSourceState({
    apiUrl: API_URL,
    authToken,
    refreshAuthToken,
    setStatusText,
    onResetCollection: handlePlaylistCollectionReset,
  });

  const { fetchYoutubeSnapshot, fetchPublicPlaylistSnapshot } =
    usePlaylistSourceSnapshots({
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
  } = usePlaylistSourcePaging({
    getSocket,
    onPagePayload: handlePlaylistPagePayload,
    handleTerminalRoomAckRef,
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

  const playlistContextValue = useMemo<PlaylistSourceContextValue>(
    () => ({
      playlistUrl,
      setPlaylistUrl,
      playlistItems,
      playlistError,
      clearPlaylistError,
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
      handleFetchPlaylistByUrl: noop as PlaylistSourceContextValue["handleFetchPlaylistByUrl"],
      handleFetchPlaylist,
      handleResetPlaylist,
      handleChangePlaylist: noop as PlaylistSourceContextValue["handleChangePlaylist"],
      handleApplyPlaylistUrlDirect: noopBool,
      handleApplyCollectionDirect: noopBool,
      handleApplyYoutubePlaylistDirect: noopBool,
      handleSuggestPlaylist: noopSuggest as PlaylistSourceContextValue["handleSuggestPlaylist"],
      handleApplySuggestionSnapshot: noopBool,
    }),
    [
      playlistUrl,
      setPlaylistUrl,
      playlistItems,
      playlistError,
      clearPlaylistError,
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
    () => ({
      getSocketRef,
      loadMorePlaylistRef,
      onResetCollectionRef,
      handleTerminalRoomAckRef,
    }),
    [],
  );

  return (
    <PlaylistSourceContext.Provider value={playlistContextValue}>
      <PlaylistLiveSettersContext.Provider value={liveSettersValue}>
        <PlaylistInputControlContext.Provider value={inputControlValue}>
          <PlaylistSocketBridgeContext.Provider value={bridgeValue}>
            {children}
          </PlaylistSocketBridgeContext.Provider>
        </PlaylistInputControlContext.Provider>
      </PlaylistLiveSettersContext.Provider>
    </PlaylistSourceContext.Provider>
  );
};
