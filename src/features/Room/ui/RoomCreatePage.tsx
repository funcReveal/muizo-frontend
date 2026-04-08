import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { type RoomCreateSourceMode } from "../model/RoomCreateContext";
import { PLAYER_MIN } from "../model/roomConstants";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useRoomSession } from "../model/RoomSessionContext";
import { useRoomPlaylist } from "../model/RoomPlaylistContext";
import { useRoomCollections } from "../model/RoomCollectionsContext";
import { useRoomCreate } from "../model/RoomCreateContext";
import { useRoomGame } from "../model/RoomGameContext";
import RoomCreationSection from "./components/RoomCreationSection";

const sourceModeLabels: Record<RoomCreateSourceMode, string> = {
  link: "YouTube 連結",
  youtube: "我的播放清單",
  publicCollection: "公開收藏庫",
  privateCollection: "私人收藏庫",
};

const RoomCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCreateStep, setActiveCreateStep] = useState<1 | 2>(1);
  const { username, authUser, loginWithGoogle } = useAuth();
  const { currentRoom } = useRoomSession();
  const {
    playlistUrl,
    playlistItems,
    playlistError,
    playlistLoading,
    playlistStage,
    playlistProgress,
    questionCount,
    questionMin,
    questionMaxLimit,
    questionStep,
    youtubePlaylists,
    youtubePlaylistsLoading,
    youtubePlaylistsError,
    setPlaylistUrl,
    updateQuestionCount,
    handleFetchPlaylist,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
  } = useRoomPlaylist();
  const {
    collections,
    collectionsLoading,
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
    toggleCollectionFavorite,
    selectCollection,
    loadCollectionItems,
  } = useRoomCollections();
  const {
    roomNameInput,
    roomVisibilityInput,
    roomCreateSourceMode,
    roomPasswordInput,
    roomMaxPlayersInput,
    joinPasswordInput,
    isCreatingRoom,
    setRoomNameInput,
    setRoomVisibilityInput,
    setRoomCreateSourceMode,
    setRoomPasswordInput,
    setRoomMaxPlayersInput,
    setJoinPasswordInput,
    handleCreateRoom,
    handleJoinRoom,
    resetCreateState,
  } = useRoomCreate();
  const {
    playDurationSec,
    revealDurationSec,
    startOffsetSec,
    allowCollectionClipTiming,
    updatePlayDurationSec,
    updateRevealDurationSec,
    updateStartOffsetSec,
    updateAllowCollectionClipTiming,
  } = useRoomGame();

  useEffect(() => {
    resetCreateState();
  }, [resetCreateState]);

  useEffect(() => {
    if (currentRoom?.id) {
      navigate(`/rooms/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.id, navigate]);

  const safeQuestionMin = questionMin ?? 1;
  const safeQuestionMax = questionMaxLimit ?? 100;
  const sourceModeLabel = sourceModeLabels[roomCreateSourceMode];

  const playlistSummary = playlistLoading
    ? "載入中"
    : playlistItems.length > 0
      ? `${playlistItems.length} 首`
      : "尚未載入";

  const normalizedMaxPlayersInput = roomMaxPlayersInput.trim();
  const parsedMaxPlayers = normalizedMaxPlayersInput
    ? Number(normalizedMaxPlayersInput)
    : null;
  const maxPlayersInvalid =
    parsedMaxPlayers !== null &&
    (!Number.isInteger(parsedMaxPlayers) ||
      parsedMaxPlayers < PLAYER_MIN ||
      parsedMaxPlayers > 16);

  const canCreateRoom = Boolean(
    username &&
      roomNameInput.trim() &&
      playlistItems.length > 0 &&
      !maxPlayersInvalid &&
      !playlistLoading,
  );

  const headerCreateDisabled =
    activeCreateStep !== 2 || !canCreateRoom || isCreatingRoom;

  return (
    <div className="room-create-v3-page mx-auto w-full max-w-[1560px] px-3 pb-4 pt-4 text-[var(--mc-text)] sm:px-4">
      {!currentRoom?.id && username && (
        <section className="room-create-studio room-create-v3-studio relative overflow-hidden p-4 shadow-[0_26px_58px_-42px_rgba(2,6,23,0.78)] sm:p-5 xl:p-6">
          <div className="room-create-v3-content relative">
            <header className="room-create-v3-hero">
              <div>
                <h1 className="room-create-display room-create-v3-title">
                  建立房間
                </h1>
              </div>
              <div className="room-create-v3-hero-actions">
                <button
                  type="button"
                  className="room-create-v3-back"
                  onClick={() => navigate("/rooms", { replace: true })}
                >
                  返回房間列表
                </button>
                <button
                  type="button"
                  className={`room-create-v3-header-create ${headerCreateDisabled ? "is-disabled" : "is-ready"}`}
                  disabled={headerCreateDisabled}
                  onClick={handleCreateRoom}
                >
                  {isCreatingRoom ? "建立中..." : "建立房間"}
                </button>
              </div>
            </header>

            <div className="room-create-v3-layout">
              <div className="room-create-v3-main-panel">
                <RoomCreationSection
                  roomName={roomNameInput}
                  roomVisibility={roomVisibilityInput}
                  sourceMode={roomCreateSourceMode}
                  roomPassword={roomPasswordInput}
                  roomMaxPlayers={roomMaxPlayersInput}
                  playlistUrl={playlistUrl}
                  playlistItems={playlistItems}
                  playlistError={playlistError}
                  playlistLoading={playlistLoading}
                  playlistStage={playlistStage}
                  rooms={[]}
                  username={username}
                  currentRoomId={currentRoom?.id ?? null}
                  joinPassword={joinPasswordInput}
                  playlistProgress={playlistProgress}
                  questionCount={questionCount}
                  playDurationSec={playDurationSec}
                  revealDurationSec={revealDurationSec}
                  startOffsetSec={startOffsetSec}
                  allowCollectionClipTiming={allowCollectionClipTiming}
                  onQuestionCountChange={updateQuestionCount}
                  onPlayDurationChange={updatePlayDurationSec}
                  onRevealDurationChange={updateRevealDurationSec}
                  onStartOffsetChange={updateStartOffsetSec}
                  onAllowCollectionClipTimingChange={
                    updateAllowCollectionClipTiming
                  }
                  questionMin={safeQuestionMin}
                  questionMax={safeQuestionMax}
                  questionStep={questionStep}
                  questionControlsEnabled
                  youtubePlaylists={youtubePlaylists}
                  youtubePlaylistsLoading={youtubePlaylistsLoading}
                  youtubePlaylistsError={youtubePlaylistsError}
                  collections={collections}
                  collectionsLoading={collectionsLoading}
                  collectionsError={collectionsError}
                  collectionScope={collectionScope}
                  publicCollectionsSort={publicCollectionsSort}
                  onPublicCollectionsSortChange={setPublicCollectionsSort}
                  collectionFavoriteUpdatingId={collectionFavoriteUpdatingId}
                  collectionsLastFetchedAt={collectionsLastFetchedAt}
                  selectedCollectionId={selectedCollectionId}
                  collectionItemsLoading={collectionItemsLoading}
                  collectionItemsError={collectionItemsError}
                  isGoogleAuthed={Boolean(authUser)}
                  onGoogleLogin={loginWithGoogle}
                  onRoomNameChange={setRoomNameInput}
                  onRoomVisibilityChange={setRoomVisibilityInput}
                  onSourceModeChange={setRoomCreateSourceMode}
                  onRoomPasswordChange={setRoomPasswordInput}
                  onRoomMaxPlayersChange={setRoomMaxPlayersInput}
                  onJoinPasswordChange={setJoinPasswordInput}
                  onPlaylistUrlChange={setPlaylistUrl}
                  onFetchPlaylist={handleFetchPlaylist}
                  onFetchYoutubePlaylists={fetchYoutubePlaylists}
                  onImportYoutubePlaylist={importYoutubePlaylist}
                  onFetchCollections={fetchCollections}
                  onToggleCollectionFavorite={toggleCollectionFavorite}
                  onSelectCollection={selectCollection}
                  onLoadCollectionItems={loadCollectionItems}
                  onJoinRoom={handleJoinRoom}
                  onStepChange={setActiveCreateStep}
                  showRoomList={false}
                  playerMin={PLAYER_MIN}
                  playerMax={16}
                />
              </div>

              <aside className="room-create-v3-aside">
                <div className="room-create-v3-aside-card">
                  <p className="room-create-v3-aside-title">目前設定</p>
                  <div className="room-create-v3-aside-row">
                    <span>來源</span>
                    <strong>{sourceModeLabel}</strong>
                  </div>
                  <div className="room-create-v3-aside-row">
                    <span>歌曲</span>
                    <strong>{playlistSummary}</strong>
                  </div>
                  <div className="room-create-v3-aside-row">
                    <span>題數</span>
                    <strong>{questionCount} 題</strong>
                  </div>
                  <div className="room-create-v3-aside-row">
                    <span>房間權限</span>
                    <strong>{roomVisibilityInput === "private" ? "私人" : "公開"}</strong>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default RoomCreatePage;
