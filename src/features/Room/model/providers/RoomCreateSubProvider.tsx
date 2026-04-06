/**
 * RoomCreateSubProvider
 *
 * 蝞∠?撱箇?/??輸??”?桃????澆 useRoomProviderCreateRoomAction?? *
 * 靘陷嚗? *   - AuthContext嚗uthToken?lientId?efreshAuthToken
 *   - RoomAuthInternalContext嚗ctiveUsername?etDefaultRoomName?reviousUsernameRef
 *   - StatusWriteContext嚗etStatusText
 *   - RoomPlaylistContext嚗laylistItems?astFetchedPlaylistId?astFetchedPlaylistTitle
 *                          questionCount?layDurationSec?evealDurationSec?tartOffsetSec?? *                          allowCollectionClipTiming嚗ackfilled values via RoomGameContext嚗? *   - RoomGameContext嚗layDurationSec?evealDurationSec?tartOffsetSec?llowCollectionClipTiming
 *   - PlaylistInputControlContext嚗esetPlaylistState
 *   - PlaylistLiveSettersContext嚗esetPlaylistPagingState?etPlaylistProgress
 *   - CollectionAccessContext嚗esetCollectionSelection?learCollectionsError
 *   - RoomSessionInternalContext嚗??session ?折撌亙
 *
 * ??嚗oomCreateContext
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../../../../shared/auth/AuthContext";
import { useRoomAuthInternal } from "./RoomAuthInternalContext";
import { useStatusWrite } from "./RoomStatusContexts";
import {
  usePlaylistInputControl,
  usePlaylistLiveSetters,
} from "./RoomPlaylistSubContexts";
import { useCollectionAccess } from "./RoomCollectionsAccessContext";
import { useRoomSessionInternal } from "./RoomSessionInternalContext";
import { useRoomPlaylist } from "../RoomPlaylistContext";
import { useRoomGame } from "../RoomGameContext";
import {
  RoomCreateContext,
  type RoomCreateContextValue,
  type RoomCreateSourceMode,
} from "../RoomCreateContext";
import { useRoomProviderCreateRoomAction } from "../useRoomProviderCreateRoomAction";
import { API_URL, DEFAULT_ROOM_MAX_PLAYERS } from "../roomConstants";

export const RoomCreateSubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // ?? Reads from parent providers ????????????????????????????????????????????
  const { authToken, clientId, refreshAuthToken } = useAuth();
  const {
    activeUsername,
    getDefaultRoomName,
    previousUsernameRef,
  } = useRoomAuthInternal();
  const { setStatusText } = useStatusWrite();
  const { resetPlaylistState } = usePlaylistInputControl();
  const { resetPlaylistPagingState, setPlaylistProgress } = usePlaylistLiveSetters();
  const { resetCollectionSelection, clearCollectionsError } = useCollectionAccess();

  const {
    playlistItems,
    lastFetchedPlaylistId,
    lastFetchedPlaylistTitle,
    questionCount,
  } = useRoomPlaylist();

  const {
    playDurationSec,
    revealDurationSec,
    startOffsetSec,
    allowCollectionClipTiming,
  } = useRoomGame();

  const {
    getSocket,
    syncServerOffset,
    lockSessionClientId,
    persistRoomId,
    saveRoomPassword,
    seedPresenceParticipants,
    mergeCachedParticipantPing,
    fetchPlaylistPage,
    currentRoomIdRef,
    createRoomInFlightRef,
    releaseCreateRoomLockRef,
    setCurrentRoom,
    setParticipants,
    setMessages,
    setSettlementHistory,
    setPlaylistProgress: setPlaylistProgressSession,
    setGameState,
    setIsGameView,
    setGamePlaylist,
    setRooms,
    setHostRoomPassword,
    setRouteRoomResolved,
    joinPasswordInput,
    setJoinPasswordInput,
    handleJoinRoom,
    resetGameSettingsDefaults,
  } = useRoomSessionInternal();

  // ?? Local state ????????????????????????????????????????????????????????????
  const [roomNameInput, setRoomNameInput] = useState(
    () => getDefaultRoomName(activeUsername),
  );
  const [roomVisibilityInput, setRoomVisibilityInput] = useState<
    "public" | "private"
  >("public");
  const [roomCreateSourceMode, setRoomCreateSourceMode] =
    useState<RoomCreateSourceMode>("link");
  const [roomPasswordInput, setRoomPasswordInput] = useState("");
  const [roomMaxPlayersInput, setRoomMaxPlayersInput] = useState(
    String(DEFAULT_ROOM_MAX_PLAYERS),
  );
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // ?? Sync roomNameInput when username changes ???????????????????????????????
  useEffect(() => {
    const previousUsername = previousUsernameRef.current;
    const previousDefaultName = getDefaultRoomName(previousUsername);
    const nextDefaultName = getDefaultRoomName(activeUsername);

    setRoomNameInput((currentValue) => {
      const trimmed = currentValue.trim();
      if (!trimmed || trimmed === previousDefaultName || trimmed === "未命名房間") {
        return nextDefaultName;
      }
      return currentValue;
    });
  }, [activeUsername, getDefaultRoomName, previousUsernameRef]);

  // ?? handleCreateRoom ???????????????????????????????????????????????????????
  const { handleCreateRoom } = useRoomProviderCreateRoomAction({
    apiUrl: API_URL,
    getSocket,
    username: activeUsername,
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
    clientId,
    fetchPlaylistPage,
    lockSessionClientId,
    persistRoomId,
    seedPresenceParticipants,
    mergeCachedParticipantPing,
    syncServerOffset,
    saveRoomPassword,
    currentRoomIdRef,
    setCurrentRoom,
    setParticipants,
    setMessages,
    setSettlementHistory,
    setPlaylistProgress: setPlaylistProgressSession,
    setGameState,
    setIsGameView,
    setGamePlaylist,
    setRooms,
    setHostRoomPassword,
    setRoomNameInput,
    setRoomMaxPlayersInput,
  });

  // ?? resetCreateState ???????????????????????????????????????????????????????
  const resetCreateState = useCallback(() => {
    setRoomNameInput(getDefaultRoomName(activeUsername));
    setRoomVisibilityInput("public");
    setRoomCreateSourceMode("link");
    setRoomPasswordInput("");
    setRoomMaxPlayersInput(String(DEFAULT_ROOM_MAX_PLAYERS));
    resetGameSettingsDefaults();
    resetPlaylistState();
    resetCollectionSelection();
    clearCollectionsError();
    resetPlaylistPagingState();
    setPlaylistProgress({ received: 0, total: 0, ready: false });
    setRouteRoomResolved(false);
  }, [
    activeUsername,
    clearCollectionsError,
    getDefaultRoomName,
    resetCollectionSelection,
    resetGameSettingsDefaults,
    resetPlaylistPagingState,
    resetPlaylistState,
    setPlaylistProgress,
    setRouteRoomResolved,
  ]);

  // ?? RoomCreateContext value ????????????????????????????????????????????????
  const ctxValue = useMemo<RoomCreateContextValue>(
    () => ({
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
      roomNameInput,
      roomVisibilityInput,
      roomCreateSourceMode,
      roomPasswordInput,
      roomMaxPlayersInput,
      joinPasswordInput,
      setJoinPasswordInput,
      isCreatingRoom,
      handleCreateRoom,
      handleJoinRoom,
      resetCreateState,
    ],
  );

  return (
    <RoomCreateContext.Provider value={ctxValue}>
      {children}
    </RoomCreateContext.Provider>
  );
};

