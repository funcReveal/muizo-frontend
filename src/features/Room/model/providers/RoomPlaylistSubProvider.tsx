/**
 * RoomPlaylistSubProvider
 *
 * 蝞∠??拚??剜皜???
 *   1. 銵典/頛詨???playlistUrl?etchedItems?ouTube playlists?uestionCount
 *   2. ?單??輸????playlistViewItems?laylistHasMore?laylistProgress?laylistSuggestions
 *      嚗 socket 撽?嚗? PlaylistLiveSettersContext 霈?SessionCoreProvider ?湔嚗? *
 * ?祇? context嚗? *   - RoomPlaylistContext  ??瘨祥?蝙?? *
 * ?折 context嚗?靘? provider 霈??嚗? *   - PlaylistLiveSettersContext   ??SessionCoreProvider 霈?誑?湔 socket-driven state
 *   - PlaylistInputControlContext  ??CollectionsSubProvider 霈?誑?澆 applyPlaylistSource
 *   - PlaylistSocketBridgeContext  ??SessionCoreProvider 憛怠 getSocketRef / loadMorePlaylistRef
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

// ??? Provider ????????????????????????????????????????????????????????????????

export const RoomPlaylistSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { authToken, refreshAuthToken } = useAuth();
  const { setStatusText } = useStatusWrite();

  // ?? ?單????socket 撽?嚗???????????????????????????????????????????????
  const [playlistProgress, setPlaylistProgress] = useState<{
    received: number;
    total: number;
    ready: boolean;
  }>({ received: 0, total: 0, ready: false });
  const [playlistSuggestions, setPlaylistSuggestions] = useState<
    PlaylistSuggestion[]
  >([]);

  // ?? Bridge refs嚗 SessionCoreProvider ?冽?頛?憛怠嚗??????????????????????
  const getSocketRef = useRef<() => ClientSocket | null>(() => null);
  const loadMorePlaylistRef = useRef<() => void>(() => {});
  const onResetCollectionRef = useRef<() => void>(() => {});

  const getSocket = useCallback(() => getSocketRef.current(), []);

  const handlePlaylistCollectionReset = useCallback(() => {
    onResetCollectionRef.current();
  }, []);

  // ?? useRoomPlaylist ????????????????????????????????????????????????????????
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

  // ?? useRoomPlaylistSnapshots ???????????????????????????????????????????????
  const { fetchYoutubeSnapshot, fetchPublicPlaylistSnapshot } =
    useRoomPlaylistSnapshots({
      apiUrl: API_URL,
      authToken,
      refreshAuthToken,
      youtubePlaylists,
      extractVideoIdFromUrl,
    });

  // ?? questionCount ???????????????????????????????????????????????????????
  const handleUpdateQuestionCount = useCallback(
    (value: number) => {
      const clamped = updateQuestionCount(value);
      setStoredQuestionCount(clamped);
    },
    [updateQuestionCount],
  );

  // ?? ?? ??????????????????????????????????????????????????????????????????
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

  // ?? loadMorePlaylist ?? ref 頝舐 ?????????????????????????????????????????
  // 撖阡?撖虫???SessionCoreProvider 憛怠 loadMorePlaylistRef
  const loadMorePlaylist = useCallback(() => loadMorePlaylistRef.current(), []);

  // ?? Socket ?賊? action placeholder嚗 SessionCoreProvider 閬神嚗??????????
  // ?? action ?閬?socket嚗隞?no-op 雿?嚗essionCoreProvider ??
  // PlaylistContextPatchContext嚗?銝???摰????亙 RoomSessionContext
  // ?? handleFetchPlaylistByUrl 蝑?靘陷甇方???  // 甇方?閮剔 noop ?臬??函? ??瘨祥??閬? action ?? useRoomPlaylist()
  // ??handleFetchPlaylistByUrl 蝑?敺?????RoomPlaylistContext 銝剔
  // SessionCoreProvider ??patch context 閬神嚗?閬?PlaylistContextPatchContext嚗?  const noop = useCallback(async () => {}, []);
  const noopBool = useCallback(async () => false as const, []);
  const noopSuggest = useCallback(async () => ({ ok: false as const }), []);

  // ?? RoomPlaylistContext value ??????????????????????????????????????????????
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
      noopBool,
      noopSuggest,
    ],
  );

  // ?? PlaylistLiveSettersContext value ??????????????????????????????????????
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

  // ?? PlaylistInputControlContext value ?????????????????????????????????????
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

  // ?? PlaylistSocketBridgeContext value ?????????????????????????????????????
  // refs ?祈澈?舐帘摰? ??useMemo 銝?閬遙雿?deps
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

