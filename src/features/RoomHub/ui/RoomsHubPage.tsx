import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useContext } from "react";
import { Button, TextField, useMediaQuery } from "@mui/material";
import {
  AddCircleOutlineRounded,
  ChevronLeftRounded,
  MeetingRoomRounded,
} from "@mui/icons-material";

import type { RoomSummary } from "@domain/room/types";
import { useAuth } from "@shared/auth/AuthContext";
import {
  useRoomSession,
  useRoomCreate,
  useRoomCollections,
  useRoomPlaylist,
  useRoomGame,
  useSitePresence,
} from "@features/RoomSession/model/runtimeHooks";
import {
  DEFAULT_BGM_VOLUME,
  SettingsModelContext,
} from "@features/Setting/model/settingsContext";
import { apiFetchRoomById } from "@domain/room/api";
import {
  API_URL,
  PLAYER_MAX,
  PLAYER_MIN,
  USERNAME_MAX,
} from "@domain/room/constants";
import {
  PlaylistIssueRow,
  PlaylistPreviewRow,
  type PlaylistIssueListItem,
} from "./components/source/PlaylistPreviewRows";
import RoomSetupPanel from "./components/setup/RoomSetupPanel";
import RoomSetupSidebarSummary from "./components/setup/RoomSetupSidebarSummary";
import JoinRoomPanel from "./components/join/JoinRoomPanel";
import LibrarySourcePanel from "./components/source/LibrarySourcePanel";
import LibrarySourceToolbar from "./components/source/LibrarySourceToolbar";
import CollectionsSourceContent from "./components/source/CollectionsSourceContent";
import CollectionCard from "./components/source/CollectionCard";
import YoutubeSourceContent from "./components/source/YoutubeSourceContent";
import YoutubePlaylistCard from "./components/source/YoutubePlaylistCard";
import PlaylistLinkSourceContent from "./components/source/PlaylistLinkSourceContent";
import VirtualLibraryListRow from "./components/source/VirtualLibraryListRow";
import { useJoinRoomPanelState } from "./hooks/useJoinRoomPanelState";
import { useLibrarySourceUiState } from "./hooks/useLibrarySourceUiState";
import {
  canAttemptPlaylistPreview,
  usePlaylistImportUi,
} from "./hooks/usePlaylistImportUi";
import { usePublicCollectionsSearchUi } from "./hooks/usePublicCollectionsSearchUi";
import { useSharedCollectionEntry } from "./hooks/useSharedCollectionEntry";
import {
  buildCreateSettingsCards,
  buildSelectedCreateSourceSummary,
  formatDurationLabel,
  normalizeRoomCodeInput,
  formatRoomCodeDisplay,
  getRoomPlaylistLabel,
  getRoomStatusLabel,
  roomRequiresPin,
} from "./roomsHubViewModels";

const isRoomCurrentlyPlaying = (room: RoomSummary) => {
  const source = room as RoomSummary &
    Record<string, unknown> & {
      gameState?: { status?: unknown } | null;
    };

  const boolCandidates = [
    source.isPlaying,
    source.playing,
    source.inGame,
    source.hasActiveGame,
  ];
  if (boolCandidates.some((value) => value === true)) return true;

  const stringCandidates = [
    source.gameStatus,
    source.game_status,
    source.status,
    source.liveStatus,
    source.roomStatus,
    source.gameState?.status,
  ];
  for (const value of stringCandidates) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "playing" ||
      normalized === "in_progress" ||
      normalized === "active" ||
      normalized === "started" ||
      normalized === "running"
    ) {
      return true;
    }
  }

  return false;
};

const skeletonWaveClass =
  "relative overflow-hidden rounded-xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(8,15,28,0.94),rgba(15,23,42,0.78))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_-24px_rgba(6,182,212,0.6)]";

const skeletonPulseClass =
  "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_22%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(34,197,94,0.08),transparent_24%),linear-gradient(90deg,rgba(148,163,184,0.08),rgba(148,163,184,0.02))] before:animate-[skeleton-breathe_3.4s_ease-in-out_infinite]";

const skeletonShimmerClass =
  "after:pointer-events-none after:absolute after:inset-y-0 after:left-[-35%] after:w-[42%] after:-skew-x-[22deg] after:bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.18),rgba(255,255,255,0.34),rgba(125,211,252,0.18),transparent)] after:blur-[1px] after:animate-[skeleton-sheen_1.9s_cubic-bezier(0.22,1,0.36,1)_infinite]";

const buildSkeletonClassName = (shapeClassName: string) =>
  `${skeletonWaveClass} ${skeletonPulseClass} ${skeletonShimmerClass} ${shapeClassName}`;

const skeletonLineClass =
  "rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

const renderYoutubeSkeletonCard = (idx: number, view: "grid" | "list") => {
  if (view === "grid") {
    return (
      <div key={`yt-skeleton-${idx}`} className={buildSkeletonClassName("p-3")}>
        <div className="mb-3 h-28 w-full rounded-md bg-white/8" />
        <div className="space-y-2">
          <div className={`${skeletonLineClass} h-4 w-[72%]`} />
          <div className={`${skeletonLineClass} h-3 w-[44%]`} />
          <div className={`${skeletonLineClass} h-3 w-[24%]`} />
        </div>
      </div>
    );
  }

  return (
    <div
      key={`yt-skeleton-${idx}`}
      className={buildSkeletonClassName("flex items-center gap-3 px-3 py-2")}
    >
      <div className="h-10 w-16 shrink-0 rounded-md bg-white/8" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`${skeletonLineClass} h-4 w-[68%]`} />
        <div className={`${skeletonLineClass} h-3 w-[38%]`} />
      </div>
      <div className={`${skeletonLineClass} h-3 w-10 shrink-0`} />
    </div>
  );
};

const renderCollectionSkeletonCard = (idx: number, view: "grid" | "list") => {
  if (view === "grid") {
    return (
      <div
        key={`collection-skeleton-${idx}`}
        className={buildSkeletonClassName("p-3")}
      >
        <div className="mb-3 h-28 w-full rounded-md bg-white/8" />
        <div className="space-y-2">
          <div className={`${skeletonLineClass} h-4 w-[76%]`} />
          <div className={`${skeletonLineClass} h-3 w-[52%]`} />
          <div className={`${skeletonLineClass} h-3 w-[48%]`} />
        </div>
      </div>
    );
  }

  return (
    <div
      key={`collection-skeleton-${idx}`}
      className={buildSkeletonClassName("flex items-center gap-3 px-3 py-2")}
    >
      <div className="h-11 w-16 shrink-0 rounded-md bg-white/8" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={`${skeletonLineClass} h-4 w-[72%]`} />
        <div className={`${skeletonLineClass} h-3 w-[46%]`} />
        <div className={`${skeletonLineClass} h-3 w-[54%]`} />
      </div>
    </div>
  );
};

const GUIDE_MODE_STORAGE_KEY = "room_guide_mode";
const JOIN_ENTRY_TAB_STORAGE_KEY = "room_join_entry_tab";
const ROOMS_HUB_BGM_PATH = "/rooms-hub-bgm.mp3";
const ROOMS_HUB_BGM_FADE_IN_MS = 1200;

const RoomsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const settingsModel = useContext(SettingsModelContext);
  const bgmVolume = settingsModel?.bgmVolume ?? DEFAULT_BGM_VOLUME;
  const {
    username,
    usernameInput,
    setUsernameInput,
    handleSetUsername,
    loginWithGoogle,
    authLoading,
    authUser,
  } = useAuth();
  const { siteOnlineCount } = useSitePresence();
  const { rooms, currentRoom, isConnected } = useRoomSession();
  const displayedSiteOnlineCount = siteOnlineCount ?? (isConnected ? 1 : null);
  const {
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsError,
    collectionItemsError,
    collectionItemsLoading,
    collectionScope,
    publicCollectionsSort,
    setPublicCollectionsSort,
    collectionFavoriteUpdatingId,
    fetchCollections,
    loadMoreCollections,
    toggleCollectionFavorite,
    loadCollectionItems,
  } = useRoomCollections();
  const {
    youtubePlaylists,
    youtubePlaylistsLoading,
    fetchYoutubePlaylists,
    importYoutubePlaylist,
    playlistItems,
    playlistLoading,
    playlistError,
    playlistPreviewMeta,
    lastFetchedPlaylistTitle,
    handleFetchPlaylistByUrl,
    handleResetPlaylist,
    questionCount,
    questionMin,
    questionMaxLimit,
    updateQuestionCount,
  } = useRoomPlaylist();
  const {
    roomNameInput,
    setRoomNameInput,
    roomVisibilityInput,
    setRoomVisibilityInput,
    roomPasswordInput,
    setRoomPasswordInput,
    roomMaxPlayersInput,
    setRoomMaxPlayersInput,
    roomCreateSourceMode,
    setRoomCreateSourceMode,
    isCreatingRoom,
    handleCreateRoom,
    setJoinPasswordInput,
    handleJoinRoom,
  } = useRoomCreate();
  const {
    playDurationSec,
    updatePlayDurationSec,
    revealDurationSec,
    updateRevealDurationSec,
    startOffsetSec,
    updateStartOffsetSec,
    allowCollectionClipTiming,
    updateAllowCollectionClipTiming,
  } = useRoomGame();
  const isLibraryGridWide = useMediaQuery("(min-width:640px)");
  const isLibraryGridThreeColumn = useMediaQuery("(min-width:1536px)");
  const [guideMode, setGuideMode] = useState<"create" | "join">(() => {
    if (typeof window === "undefined") return "create";
    const stored = window.sessionStorage.getItem(GUIDE_MODE_STORAGE_KEY);
    return stored === "join" ? "join" : "create";
  });
  const {
    passwordDialog,
    setPasswordDialog,
    joinConfirmDialog,
    setJoinConfirmDialog,
    passwordDraft,
    setPasswordDraft,
    directRoomIdInput,
    setDirectRoomIdInput,
    joinEntryTab,
    setJoinEntryTab,
    isDirectRoomCodeFocused,
    setIsDirectRoomCodeFocused,
    directJoinLoading,
    setDirectJoinLoading,
    setDirectJoinPreviewRoom,
    directJoinError,
    setDirectJoinError,
    directJoinNeedsPassword,
    setDirectJoinNeedsPassword,
    joinRoomsView,
    setJoinRoomsView,
    joinPasswordFilter,
    setJoinPasswordFilter,
    joinStatusFilter,
    setJoinStatusFilter,
    joinSortMode,
    setJoinSortMode,
    normalizedDirectRoomCode,
    directRoomCodeSlots,
    activeDirectRoomCodeIndex,
    resolvedDirectJoinRoom,
  } = useJoinRoomPanelState({
    entryTabStorageKey: JOIN_ENTRY_TAB_STORAGE_KEY,
  });
  const {
    createLibraryTab,
    setCreateLibraryTab,
    sharedCollectionMeta,
    setSharedCollectionMeta,
    createLibraryView,
    setCreateLibraryView,
    createLibrarySearch,
    setCreateLibrarySearch,
    createLeftTab,
    setCreateLeftTab,
    playlistUrlDraft,
    setPlaylistUrlDraft,
    playlistPreviewError,
    setPlaylistPreviewError,
    isPlaylistUrlFieldFocused,
    setIsPlaylistUrlFieldFocused,
    isPublicLibrarySearchExpanded,
    setIsPublicLibrarySearchExpanded,
    selectedCreateCollectionId,
    setSelectedCreateCollectionId,
    selectedCreateYoutubeId,
    setSelectedCreateYoutubeId,
    previousCreateLibraryTabRef,
  } = useLibrarySourceUiState();
  const hasRequestedYoutubePlaylistsRef = useRef(false);
  const createLibraryScrollRef = useRef<HTMLDivElement | null>(null);
  const directRoomCodeInputRef = useRef<HTMLInputElement | null>(null);
  const publicLibrarySearchPanelRef = useRef<HTMLDivElement | null>(null);
  const roomsHubBgmRef = useRef<HTMLAudioElement | null>(null);
  const roomsHubBgmFadeFrameRef = useRef<number | null>(null);
  const roomsHubBgmFadeStartedRef = useRef(false);
  const roomsHubBgmFadeDoneRef = useRef(false);
  const playRoomsHubBgmRef = useRef<() => void>(() => undefined);
  const roomsHubBgmTargetVolumeRef = useRef(
    Math.max(0, Math.min(1, bgmVolume / 100)),
  );

  useEffect(() => {
    if (currentRoom?.id) {
      navigate(`/rooms/${currentRoom.id}`, { replace: true });
    }
  }, [currentRoom?.id, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(GUIDE_MODE_STORAGE_KEY, guideMode);
  }, [guideMode]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Audio === "undefined") return;

    const audio = new Audio(ROOMS_HUB_BGM_PATH);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    roomsHubBgmRef.current = audio;
    roomsHubBgmFadeStartedRef.current = false;
    roomsHubBgmFadeDoneRef.current = false;

    const cancelFadeFrame = () => {
      if (roomsHubBgmFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(roomsHubBgmFadeFrameRef.current);
        roomsHubBgmFadeFrameRef.current = null;
      }
    };

    const runInitialFadeIn = () => {
      if (roomsHubBgmFadeDoneRef.current) {
        audio.volume = roomsHubBgmTargetVolumeRef.current;
        return;
      }
      if (roomsHubBgmFadeStartedRef.current) return;
      roomsHubBgmFadeStartedRef.current = true;
      cancelFadeFrame();
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(
          1,
          (now - startedAt) / ROOMS_HUB_BGM_FADE_IN_MS,
        );
        audio.volume = roomsHubBgmTargetVolumeRef.current * progress;
        if (progress >= 1) {
          roomsHubBgmFadeDoneRef.current = true;
          roomsHubBgmFadeFrameRef.current = null;
          return;
        }
        roomsHubBgmFadeFrameRef.current = window.requestAnimationFrame(tick);
      };
      roomsHubBgmFadeFrameRef.current = window.requestAnimationFrame(tick);
    };

    const playRoomsHubBgm = () => {
      if (document.hidden) return;
      if (roomsHubBgmTargetVolumeRef.current <= 0) return;
      void audio
        .play()
        .then(() => {
          if (roomsHubBgmFadeDoneRef.current) {
            audio.volume = roomsHubBgmTargetVolumeRef.current;
            return;
          }
          if (!roomsHubBgmFadeStartedRef.current) {
            runInitialFadeIn();
          }
        })
        .catch(() => {
          // Browser autoplay policy may block until the next user gesture.
        });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        audio.pause();
        return;
      }
      playRoomsHubBgm();
    };

    const handleWindowBlur = () => {
      audio.pause();
    };

    const handleWindowFocus = () => {
      playRoomsHubBgm();
    };

    playRoomsHubBgmRef.current = playRoomsHubBgm;
    playRoomsHubBgm();
    window.addEventListener("pointerdown", playRoomsHubBgm, { passive: true });
    window.addEventListener("mousedown", playRoomsHubBgm, { passive: true });
    window.addEventListener("click", playRoomsHubBgm, { passive: true });
    window.addEventListener("touchstart", playRoomsHubBgm, { passive: true });
    window.addEventListener("keydown", playRoomsHubBgm);
    window.addEventListener("pageshow", playRoomsHubBgm);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelFadeFrame();
      playRoomsHubBgmRef.current = () => undefined;
      window.removeEventListener("pointerdown", playRoomsHubBgm);
      window.removeEventListener("mousedown", playRoomsHubBgm);
      window.removeEventListener("click", playRoomsHubBgm);
      window.removeEventListener("touchstart", playRoomsHubBgm);
      window.removeEventListener("keydown", playRoomsHubBgm);
      window.removeEventListener("pageshow", playRoomsHubBgm);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      roomsHubBgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const nextVolume = Math.max(0, Math.min(1, bgmVolume / 100));
    roomsHubBgmTargetVolumeRef.current = nextVolume;
    if (nextVolume <= 0) {
      roomsHubBgmRef.current?.pause();
      return;
    }
    if (!roomsHubBgmRef.current) return;
    if (roomsHubBgmRef.current.paused) {
      playRoomsHubBgmRef.current();
    }
    if (!roomsHubBgmFadeDoneRef.current) return;
    roomsHubBgmRef.current.volume = nextVolume;
  }, [bgmVolume]);

  useEffect(() => {
    if (guideMode !== "join" || joinEntryTab !== "code") return;
    const frame = window.requestAnimationFrame(() => {
      directRoomCodeInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guideMode, joinEntryTab]);

  useEffect(() => {
    if (guideMode !== "join" || joinEntryTab !== "code") return;
    if (normalizedDirectRoomCode.length < 6) {
      setDirectJoinLoading(false);
      setDirectJoinPreviewRoom(null);
      setDirectJoinNeedsPassword(false);
      if (!normalizedDirectRoomCode.length) {
        setDirectJoinError(null);
      }
      return;
    }
    if (!API_URL) {
      setDirectJoinLoading(false);
      setDirectJoinPreviewRoom(null);
      setDirectJoinError("目前無法驗證房間，請稍後再試。");
      return;
    }

    let isActive = true;
    setDirectJoinLoading(true);
    setDirectJoinError(null);
    setDirectJoinPreviewRoom(null);
    setDirectJoinNeedsPassword(false);

    void (async () => {
      try {
        const result = await apiFetchRoomById(
          API_URL,
          normalizedDirectRoomCode,
        );
        const fetchedRoom = (result.payload as { room?: RoomSummary } | null)
          ?.room;
        if (!isActive) return;
        if (!result.ok || !fetchedRoom) {
          setDirectJoinError("找不到該房間，請確認房間代碼是否正確。");
          return;
        }
        setDirectJoinPreviewRoom(fetchedRoom);
        setDirectJoinNeedsPassword(roomRequiresPin(fetchedRoom));
      } catch {
        if (!isActive) return;
        setDirectJoinError("查詢房間失敗，請稍後再試。");
      } finally {
        if (isActive) {
          setDirectJoinLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    guideMode,
    joinEntryTab,
    normalizedDirectRoomCode,
    setDirectJoinError,
    setDirectJoinLoading,
    setDirectJoinNeedsPassword,
    setDirectJoinPreviewRoom,
  ]);

  const canUseGoogleLibraries = Boolean(authUser);
  const filteredJoinRooms = useMemo(() => {
    const next = [...rooms].filter((room) => {
      if (joinPasswordFilter === "no_password") return !roomRequiresPin(room);
      if (joinPasswordFilter === "password_required")
        return roomRequiresPin(room);
      if (joinStatusFilter === "waiting") return !isRoomCurrentlyPlaying(room);
      if (joinStatusFilter === "playing") return isRoomCurrentlyPlaying(room);
      return true;
    });
    if (joinSortMode === "players_desc") {
      next.sort((a, b) => b.playerCount - a.playerCount);
      return next;
    }
    next.sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime();
      const bTs = new Date(b.createdAt).getTime();
      return bTs - aTs;
    });
    return next;
  }, [joinPasswordFilter, joinSortMode, joinStatusFilter, rooms]);
  const filteredJoinPlayerTotal = useMemo(
    () =>
      filteredJoinRooms.reduce(
        (total, room) => total + Math.max(0, room.playerCount ?? 0),
        0,
      ),
    [filteredJoinRooms],
  );
  const playlistPreviewItems = useMemo(
    () =>
      playlistItems.map((item) => ({
        title: item.title,
        uploader: item.uploader,
        duration: item.duration,
        thumbnail: item.thumbnail,
        url: item.url,
        videoId: item.videoId,
      })),
    [playlistItems],
  );
  const playlistIssueSummary = useMemo(() => {
    if (playlistPreviewMeta?.skippedItems?.length) {
      const removed: PlaylistIssueListItem[] = [];
      const privateRestricted: PlaylistIssueListItem[] = [];
      const embedBlocked: PlaylistIssueListItem[] = [];
      const unavailable: PlaylistIssueListItem[] = [];
      const unknown: PlaylistIssueListItem[] = [];
      const normalizeBlockedReason = (reason?: string | null) => {
        const normalized = reason?.trim() ?? "";
        const lower = normalized.toLowerCase();
        if (
          lower.includes("age") ||
          lower.includes("mature") ||
          lower.includes("adult") ||
          normalized.includes("年齡") ||
          normalized.includes("限制級")
        ) {
          return "因年齡限制，不允許嵌入播放";
        }
        if (
          lower.includes("copyright") ||
          lower.includes("rights") ||
          lower.includes("owner") ||
          normalized.includes("版權") ||
          normalized.includes("權利") ||
          normalized.includes("擁有者")
        ) {
          return "因版權或權利設定，不允許嵌入播放";
        }
        if (
          lower.includes("embedding disabled") ||
          lower.includes("embed") ||
          normalized.includes("嵌入")
        ) {
          return "此影片不允許嵌入播放";
        }
        return "此影片不允許嵌入播放";
      };
      playlistPreviewMeta.skippedItems.forEach((item) => {
        const title = item.title?.trim() || item.videoId || "未知項目";
        const thumbnail = item.videoId
          ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
          : undefined;
        const fallbackReason =
          item.status === "removed"
            ? "影片已移除"
            : item.status === "private"
              ? "私人或受限制，無法匯入"
              : item.status === "blocked"
                ? normalizeBlockedReason(item.reason)
                : item.status === "unavailable"
                  ? "影片目前不可用"
                  : "無法判斷匯入原因";
        const issueItem = {
          title,
          thumbnail,
          reason:
            item.status === "blocked"
              ? normalizeBlockedReason(item.reason)
              : item.reason?.trim() || fallbackReason,
        };
        if (item.status === "removed") {
          removed.push(issueItem);
          return;
        }
        if (item.status === "private") {
          privateRestricted.push(issueItem);
          return;
        }
        if (item.status === "blocked") {
          embedBlocked.push(issueItem);
          return;
        }
        if (item.status === "unavailable") {
          unavailable.push(issueItem);
          return;
        }
        unknown.push(issueItem);
      });
      return {
        removed,
        privateRestricted,
        embedBlocked,
        unavailable,
        unknown,
        unknownCount: 0,
        exact: true,
      };
    }
    if ((playlistPreviewMeta?.skippedCount ?? 0) > 0) {
      return {
        removed: [],
        privateRestricted: [],
        embedBlocked: [],
        unavailable: [],
        unknown: [],
        unknownCount: playlistPreviewMeta?.skippedCount ?? 0,
        exact: false,
      };
    }
    return {
      removed: [],
      privateRestricted: [],
      embedBlocked: [],
      unavailable: [],
      unknown: [],
      unknownCount: 0,
      exact: false,
    };
  }, [playlistPreviewMeta]);
  const sharedCollectionId = searchParams.get("sharedCollection");
  const { handledSharedCollectionRef } = useSharedCollectionEntry({
    sharedCollectionId,
    roomCreateSourceMode,
    selectedCreateCollectionId,
    playlistItemsLength: playlistItems.length,
    playlistLoading,
    collectionItemsError,
    setGuideMode,
    setCreateLibraryTab,
    setCreateLeftTab,
    setRoomCreateSourceMode,
    updateAllowCollectionClipTiming,
    setSelectedCreateYoutubeId,
    setSelectedCreateCollectionId,
    setSharedCollectionMeta,
    handleResetPlaylist,
    loadCollectionItems,
  });
  const {
    isLinkSourceActive,
    trimmedPlaylistUrlDraft,
    playlistUrlLooksValid,
    linkPreviewLocked,
    linkPlaylistTitle,
    linkPlaylistPreviewItems,
    linkPlaylistIssueSummary,
    handlePreviewPlaylistByUrl,
    handleClearPlaylistUrlInput,
    showPlaylistUrlError,
    showPlaylistUrlWarning,
    playlistUrlTooltipMessage,
    linkPlaylistCount,
    handleActivateLinkSource,
    handlePickLinkSource,
    lastAutoPreviewUrlRef,
  } = usePlaylistImportUi({
    createLibraryTab,
    roomCreateSourceMode,
    playlistUrlDraft,
    setPlaylistUrlDraft,
    playlistPreviewError,
    setPlaylistPreviewError,
    playlistError,
    playlistLoading,
    lastFetchedPlaylistTitle,
    playlistItemsLength: playlistItems.length,
    playlistPreviewItems,
    playlistIssueSummary,
    handleFetchPlaylistByUrl,
    handleResetPlaylist,
    setRoomCreateSourceMode,
    setSelectedCreateCollectionId,
    setSelectedCreateYoutubeId,
    setSharedCollectionMeta,
    setCreateLeftTab,
  });
  const { publicLibrarySearchActive, togglePublicLibrarySearch } =
    usePublicCollectionsSearchUi({
      createLibraryTab,
      isExpanded: isPublicLibrarySearchExpanded,
      setIsExpanded: setIsPublicLibrarySearchExpanded,
      setCreateLibrarySearch,
      panelRef: publicLibrarySearchPanelRef,
    });
  const normalizedMaxPlayersInput = roomMaxPlayersInput.trim();
  const parsedMaxPlayers = normalizedMaxPlayersInput
    ? Number(normalizedMaxPlayersInput)
    : null;
  const maxPlayersInvalid =
    parsedMaxPlayers !== null &&
    (!Number.isInteger(parsedMaxPlayers) ||
      parsedMaxPlayers < PLAYER_MIN ||
      parsedMaxPlayers > PLAYER_MAX);
  const canCreateRoom =
    Boolean(roomNameInput.trim()) &&
    playlistItems.length >= questionMin &&
    !playlistLoading &&
    !maxPlayersInvalid &&
    !isCreatingRoom;
  const isCreateSourceReady = playlistItems.length > 0;
  const selectedYoutubePlaylist = useMemo(
    () =>
      selectedCreateYoutubeId
        ? (youtubePlaylists.find(
            (item) => item.id === selectedCreateYoutubeId,
          ) ?? null)
        : null,
    [selectedCreateYoutubeId, youtubePlaylists],
  );
  const selectedCollection = useMemo(
    () =>
      selectedCreateCollectionId
        ? (collections.find((item) => item.id === selectedCreateCollectionId) ??
          null)
        : null,
    [collections, selectedCreateCollectionId],
  );
  const selectedSharedCollection =
    selectedCreateCollectionId &&
    sharedCollectionMeta?.id === selectedCreateCollectionId
      ? sharedCollectionMeta
      : null;
  const normalizedCreateLibrarySearch = createLibrarySearch
    .trim()
    .toLowerCase();
  const filteredCreateYoutubePlaylists = useMemo(() => {
    if (!normalizedCreateLibrarySearch) return youtubePlaylists;
    return youtubePlaylists.filter((playlist) =>
      playlist.title.toLowerCase().includes(normalizedCreateLibrarySearch),
    );
  }, [normalizedCreateLibrarySearch, youtubePlaylists]);
  const filteredCreateCollections = useMemo(() => {
    if (createLibraryTab === "public") return collections;
    if (!normalizedCreateLibrarySearch) return collections;
    return collections.filter((collection) => {
      const haystacks = [
        collection.title,
        collection.cover_title,
        collection.description,
        collection.cover_channel_title,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystacks.some((value) =>
        value.includes(normalizedCreateLibrarySearch),
      );
    });
  }, [collections, createLibraryTab, normalizedCreateLibrarySearch]);
  const shouldShowCollectionSkeleton =
    collectionsLoading &&
    !(
      createLibraryTab === "public" &&
      collectionScope === "public" &&
      filteredCreateCollections.length > 0
    );
  const selectedCollectionThumb =
    selectedCollection?.cover_thumbnail_url ||
    (selectedCollection?.cover_provider === "youtube" &&
    selectedCollection?.cover_source_id
      ? `https://i.ytimg.com/vi/${selectedCollection.cover_source_id}/hqdefault.jpg`
      : "") ||
    (selectedSharedCollection ? playlistItems[0]?.thumbnail || "" : "");
  const createRequirementsHintText = !roomNameInput.trim()
    ? "請先輸入房間名稱。"
    : playlistItems.length === 0
      ? "請先準備題庫內容，才能建立房間。"
      : playlistItems.length < questionMin
        ? `題庫至少需要 ${questionMin} 題，才能建立房間。`
        : maxPlayersInvalid
          ? `玩家上限需介於 ${PLAYER_MIN}-${PLAYER_MAX} 人之間。`
          : null;
  const createRecommendationHintText =
    !createRequirementsHintText &&
    playlistItems.length >= questionMin &&
    playlistItems.length < 10
      ? "目前題數偏少，雖然可以建立房間，但建議至少準備 10 題，遊戲體驗會更完整。"
      : null;
  const createSettingsCards = useMemo(
    () =>
      buildCreateSettingsCards({
        roomVisibilityInput,
        parsedMaxPlayers,
        questionCount,
        allowCollectionClipTiming,
        playDurationSec,
        revealDurationSec,
        startOffsetSec,
      }),
    [
      allowCollectionClipTiming,
      parsedMaxPlayers,
      playDurationSec,
      questionCount,
      revealDurationSec,
      roomVisibilityInput,
      startOffsetSec,
    ],
  );
  const selectedCreateSourceSummary = useMemo(
    () =>
      buildSelectedCreateSourceSummary({
        isCreateSourceReady,
        roomCreateSourceMode,
        lastFetchedPlaylistTitle,
        playlistItemsLength: playlistItems.length,
        playlistPreviewThumbnail: playlistPreviewItems[0]?.thumbnail || "",
        selectedYoutubePlaylist,
        selectedCollection,
        selectedSharedCollection,
        selectedCollectionThumb,
      }),
    [
      isCreateSourceReady,
      lastFetchedPlaylistTitle,
      playlistItems.length,
      playlistPreviewItems,
      roomCreateSourceMode,
      selectedCollection,
      selectedSharedCollection,
      selectedCollectionThumb,
      selectedYoutubePlaylist,
    ],
  );
  const supportsCollectionClipTiming =
    roomCreateSourceMode === "publicCollection" ||
    roomCreateSourceMode === "privateCollection";
  useEffect(() => {
    if (!supportsCollectionClipTiming && allowCollectionClipTiming) {
      updateAllowCollectionClipTiming(false);
    }
  }, [
    allowCollectionClipTiming,
    supportsCollectionClipTiming,
    updateAllowCollectionClipTiming,
  ]);
  const isCreateSourceSummaryLoading =
    createLeftTab === "settings" &&
    !selectedCreateSourceSummary &&
    (roomCreateSourceMode === "link" || roomCreateSourceMode === "youtube"
      ? playlistLoading
      : collectionItemsLoading);
  const createLibraryColumns = isLibraryGridThreeColumn
    ? 3
    : isLibraryGridWide
      ? 2
      : 1;
  const youtubeListRowHeight = 96;
  const collectionListRowHeight = 92;
  const collectionListRowCount =
    filteredCreateCollections.length +
    (collectionsHasMore || collectionsLoadingMore ? 1 : 0);

  const renderYoutubeCard = (
    playlistValue: unknown,
    _itemIndex: number,
    view: "grid" | "list",
  ) => {
    const playlist = playlistValue as (typeof youtubePlaylists)[number];

    return (
      <YoutubePlaylistCard
        playlist={playlist}
        view={view}
        selected={selectedCreateYoutubeId === playlist.id}
        onSelect={() => {
          void handlePickYoutubeSource(playlist.id);
        }}
      />
    );
  };

  const renderCollectionCard = (
    collectionValue: unknown,
    _itemIndex: number,
    view: "grid" | "list",
  ) => {
    const collection = collectionValue as (typeof collections)[number];
    const scope = createLibraryTab === "public" ? "public" : "owner";

    return (
      <CollectionCard
        collection={collection}
        view={view}
        selected={selectedCreateCollectionId === collection.id}
        isPublicLibraryTab={createLibraryTab === "public"}
        isFavoriteUpdating={collectionFavoriteUpdatingId === collection.id}
        formatDurationLabel={formatDurationLabel}
        onSelect={() => {
          void handlePickCollectionSource(collection.id, scope);
        }}
        onToggleFavorite={
          createLibraryTab === "public"
            ? () => toggleCollectionFavorite(collection.id)
            : undefined
        }
      />
    );
  };

  useEffect(() => {
    if (createLibraryTab === "public") {
      const switchedIntoPublic =
        previousCreateLibraryTabRef.current !== "public";
      previousCreateLibraryTabRef.current = createLibraryTab;
      if (switchedIntoPublic) {
        void fetchCollections("public", { query: createLibrarySearch });
        return;
      }
      const handle = window.setTimeout(() => {
        void fetchCollections("public", { query: createLibrarySearch });
      }, 350);
      return () => window.clearTimeout(handle);
    }
    previousCreateLibraryTabRef.current = createLibraryTab;
    if (!canUseGoogleLibraries) return;
    if (createLibraryTab === "personal") {
      void fetchCollections("owner");
      return;
    }
    if (
      createLibraryTab === "youtube" &&
      youtubePlaylists.length === 0 &&
      !youtubePlaylistsLoading &&
      !hasRequestedYoutubePlaylistsRef.current
    ) {
      hasRequestedYoutubePlaylistsRef.current = true;
      void fetchYoutubePlaylists();
    }
  }, [
    canUseGoogleLibraries,
    createLibraryTab,
    createLibrarySearch,
    fetchCollections,
    fetchYoutubePlaylists,
    previousCreateLibraryTabRef,
    publicCollectionsSort,
    youtubePlaylists.length,
    youtubePlaylistsLoading,
  ]);

  useEffect(() => {
    if (authUser) return;
    hasRequestedYoutubePlaylistsRef.current = false;
  }, [authUser]);
  useEffect(() => {
    if (
      createLibraryView !== "grid" ||
      (createLibraryTab !== "public" && createLibraryTab !== "personal") ||
      collectionsLoading ||
      collectionsLoadingMore ||
      !collectionsHasMore
    ) {
      return;
    }
    const container = createLibraryScrollRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight + 24) {
      void loadMoreCollections();
    }
  }, [
    collections.length,
    collectionsHasMore,
    collectionsLoading,
    collectionsLoadingMore,
    createLibraryTab,
    createLibraryView,
    loadMoreCollections,
  ]);
  const handlePickYoutubeSource = async (playlistId: string) => {
    setRoomCreateSourceMode("youtube");
    setSelectedCreateYoutubeId(playlistId);
    setSelectedCreateCollectionId(null);
    setSharedCollectionMeta(null);
    setCreateLeftTab("settings");
    await importYoutubePlaylist(playlistId);
  };
  const handlePickCollectionSource = async (
    collectionId: string,
    scope: "public" | "owner",
  ) => {
    updateAllowCollectionClipTiming(true);
    setRoomCreateSourceMode(
      scope === "public" ? "publicCollection" : "privateCollection",
    );
    setSelectedCreateCollectionId(collectionId);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    setCreateLeftTab("settings");
    await loadCollectionItems(collectionId, { force: true });
  };
  const handleBackToCreateLibrary = () => {
    setCreateLeftTab("library");
    setSelectedCreateCollectionId(null);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    handledSharedCollectionRef.current = null;
    handleResetPlaylist();
    setPlaylistPreviewError(null);
    lastAutoPreviewUrlRef.current = "";

    if (searchParams.get("sharedCollection")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("sharedCollection");
      navigate(
        {
          search: nextParams.toString() ? `?${nextParams.toString()}` : "",
        },
        { replace: true },
      );
    }
  };
  const closePasswordDialog = () => {
    setPasswordDialog(null);
    setPasswordDraft("");
  };
  const closeJoinConfirmDialog = () => {
    setJoinConfirmDialog(null);
  };
  const openPasswordDialog = (roomId: string, roomName: string) => {
    setJoinPasswordInput("");
    setPasswordDraft("");
    setPasswordDialog({ roomId, roomName });
  };
  const proceedJoinRoom = (
    roomCode: string,
    roomName: string,
    hasPassword: boolean,
  ) => {
    if (hasPassword) {
      openPasswordDialog(roomCode, roomName);
      return;
    }
    setJoinPasswordInput("");
    handleJoinRoom(roomCode, false);
  };
  const openInProgressJoinDialog = (room: RoomSummary) => {
    setJoinConfirmDialog({
      roomCode: room.roomCode,
      roomName: room.name,
      hasPassword: roomRequiresPin(room),
      playlistTitle: getRoomPlaylistLabel(room),
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      questionCount: room.gameSettings?.questionCount,
      currentQuestionNo:
        typeof room.currentQuestionNo === "number"
          ? room.currentQuestionNo
          : null,
      completedQuestionCount:
        typeof room.completedQuestionCount === "number"
          ? room.completedQuestionCount
          : undefined,
      totalQuestionCount:
        typeof room.totalQuestionCount === "number"
          ? room.totalQuestionCount
          : room.gameSettings?.questionCount,
    });
  };
  const handleConfirmJoinInProgress = () => {
    if (!joinConfirmDialog) return;
    proceedJoinRoom(
      joinConfirmDialog.roomCode,
      joinConfirmDialog.roomName,
      joinConfirmDialog.hasPassword,
    );
    closeJoinConfirmDialog();
  };
  const handleConfirmJoinWithPassword = () => {
    if (!passwordDialog) return;
    const trimmed = passwordDraft.trim();
    if (!trimmed) return;
    if (!/^\d{4}$/.test(trimmed)) return;
    setJoinPasswordInput(trimmed);
    handleJoinRoom(passwordDialog.roomId, true, trimmed);
    closePasswordDialog();
  };
  const handleJoinRoomEntry = (room: RoomSummary) => {
    if (isRoomCurrentlyPlaying(room)) {
      openInProgressJoinDialog(room);
      return;
    }
    proceedJoinRoom(
      room.roomCode,
      room.name || `房間 ${room.roomCode}`,
      roomRequiresPin(room),
    );
  };
  const handleDirectJoinById = async () => {
    if (directJoinLoading) return;
    const trimmed = directRoomIdInput.trim();
    if (!trimmed) {
      setDirectJoinError("請先輸入房間代碼。");
      setDirectJoinNeedsPassword(false);
      return;
    }
    if (trimmed.length < 6) {
      setDirectJoinError("請先輸入完整的 6 碼房間代碼。");
      return;
    }
    if (!resolvedDirectJoinRoom) {
      setDirectJoinError("請先等待房間資訊載入完成。");
      return;
    }
    if (isRoomCurrentlyPlaying(resolvedDirectJoinRoom)) {
      openInProgressJoinDialog(resolvedDirectJoinRoom);
      return;
    }
    proceedJoinRoom(
      resolvedDirectJoinRoom.roomCode,
      resolvedDirectJoinRoom.name || `房間 ${resolvedDirectJoinRoom.roomCode}`,
      roomRequiresPin(resolvedDirectJoinRoom),
    );
  };
  const handleCollectionGridScroll = (event: UIEvent<HTMLDivElement>) => {
    if (
      collectionsLoading ||
      collectionsLoadingMore ||
      !collectionsHasMore ||
      createLibraryView !== "grid"
    ) {
      return;
    }
    const target = event.currentTarget;
    const remaining =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining <= 180) {
      void loadMoreCollections();
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full flex-1 flex-col text-[var(--mc-text)]">
      {!currentRoom?.id && !username && (
        <section className="relative w-full overflow-hidden rounded-3xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-12 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -right-14 bottom-0 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="mt-2 text-2xl font-semibold text-[var(--mc-text)]">
              選擇進入方式，開始遊戲
            </h2>
            <p className="mt-2 text-sm text-[var(--mc-text-muted)]">
              訪客可快速加入房間，Google 登入可保留收藏、歷史與跨裝置狀態。
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-amber-300/30 bg-amber-400/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/90">
                  先試玩
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--mc-text)]">
                  訪客快速進入
                </h3>
                <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                  設定暱稱即可加入房間，隨時可升級為 Google 登入。
                </p>
                <div className="mt-3 space-y-3">
                  <TextField
                    className="mb-2 "
                    fullWidth
                    size="small"
                    label="訪客暱稱"
                    value={usernameInput}
                    onChange={(e) =>
                      setUsernameInput(e.target.value.slice(0, USERNAME_MAX))
                    }
                    inputProps={{ maxLength: USERNAME_MAX }}
                  />
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleSetUsername}
                    disabled={!usernameInput.trim()}
                  >
                    以訪客身份繼續
                  </Button>
                </div>
              </article>

              <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/90">
                  推薦登入
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--mc-text)]">
                  Google 登入
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-[var(--mc-text-muted)]">
                  <li>同步收藏與題庫設定</li>
                  <li>保留對戰歷史與回顧</li>
                  <li>跨裝置延續狀態</li>
                </ul>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3 }}
                  onClick={loginWithGoogle}
                  disabled={authLoading}
                >
                  {authLoading ? "登入中..." : "使用 Google 登入"}
                </Button>
              </article>
            </div>

            <div className="mt-4 text-xs text-[var(--mc-text-muted)]">
              先看看玩法？可前往
              <button
                type="button"
                onClick={() => navigate("/")}
                className="ml-1 text-cyan-300 hover:text-cyan-200"
              >
                首頁導覽
              </button>
              。
            </div>
          </div>
        </section>
      )}

      {!currentRoom?.id && username && (
        <section className="flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col sm:p-5">
            <div className="relative grid w-full grid-cols-2 gap-1 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 p-1">
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-1 top-1 overflow-hidden rounded-xl border transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  guideMode === "create"
                    ? "border-cyan-300/55 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(14,165,233,0.09))] shadow-[0_22px_42px_-30px_rgba(34,211,238,0.72)]"
                    : "border-amber-300/55 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(245,158,11,0.1))] shadow-[0_22px_42px_-30px_rgba(251,191,36,0.68)]"
                }`}
                style={{
                  left: "0.25rem",
                  width: "calc(50% - 0.375rem)",
                  transform:
                    guideMode === "create"
                      ? "translateX(0)"
                      : "translateX(calc(100% + 0.25rem))",
                }}
              >
                <div
                  className={`absolute inset-x-[10%] top-0 h-[58%] rounded-full blur-2xl transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "create"
                      ? "bg-cyan-200/22 opacity-100"
                      : "bg-amber-100/22 opacity-100"
                  }`}
                />
                <div
                  className={`absolute inset-y-0 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "create"
                      ? "translate-x-[-20%] opacity-90"
                      : "translate-x-[180%] opacity-90"
                  }`}
                />
              </div>
              <button
                type="button"
                className={`relative z-10 cursor-pointer rounded-xl border px-4 py-4 sm:px-5 sm:py-4.5 text-left transition-[background-color,border-color,color,transform,opacity] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  guideMode === "create"
                    ? "border-transparent bg-transparent text-cyan-50"
                    : "border-transparent text-[var(--mc-text-muted)] hover:border-cyan-300/45 hover:bg-cyan-500/12 hover:text-cyan-100"
                }`}
                onClick={() => setGuideMode("create")}
              >
                <div
                  className={`flex items-center gap-3 transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "create"
                      ? "translate-y-[-1px] scale-[1.01]"
                      : "translate-y-0 scale-100"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-[transform,background-color,border-color,color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      guideMode === "create"
                        ? "border-cyan-300/45 bg-cyan-400/14 text-cyan-100 shadow-[0_10px_24px_-18px_rgba(34,211,238,0.85)]"
                        : "border-[var(--mc-border)] bg-slate-900/30 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    <AddCircleOutlineRounded fontSize="small" />
                  </span>
                  <p className="text-base font-semibold text-[var(--mc-text)]">
                    創建房間
                  </p>
                </div>
              </button>
              <button
                type="button"
                className={`relative z-10 cursor-pointer rounded-xl border px-4 py-4 sm:px-5 sm:py-4.5 text-left transition-[background-color,border-color,color,transform,opacity] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  guideMode === "join"
                    ? "border-transparent bg-transparent text-amber-50"
                    : "border-transparent text-[var(--mc-text-muted)] hover:border-amber-300/45 hover:bg-amber-400/12 hover:text-amber-100"
                }`}
                onClick={() => setGuideMode("join")}
              >
                <div
                  className={`flex items-center gap-3 transition-transform duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    guideMode === "join"
                      ? "translate-y-[-1px] scale-[1.01]"
                      : "translate-y-0 scale-100"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-[transform,background-color,border-color,color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      guideMode === "join"
                        ? "border-amber-300/45 bg-amber-400/14 text-amber-100 shadow-[0_10px_24px_-18px_rgba(251,191,36,0.9)]"
                        : "border-[var(--mc-border)] bg-slate-900/30 text-[var(--mc-text-muted)]"
                    }`}
                  >
                    <MeetingRoomRounded fontSize="small" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <p className="text-base font-semibold text-[var(--mc-text)]">
                      加入房間
                    </p>
                    <span className="text-[11px] font-medium leading-none text-[var(--mc-text-muted)] sm:translate-y-[1px]">
                      {displayedSiteOnlineCount ?? "--"} 人在線
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <div
              key={`guide-panel-${guideMode}`}
              className="mt-2 flex min-h-0 flex-1 flex-col animate-[guide-panel-enter_220ms_ease-out]"
            >
              {guideMode === "create" ? (
                <div className="flex min-h-0 flex-1 flex-col lg:rounded-2xl lg:border lg:border-[var(--mc-border)] lg:p-4">
                  <LibrarySourcePanel
                    createLeftTab={createLeftTab}
                    createLibraryTab={createLibraryTab}
                    canUseGoogleLibraries={canUseGoogleLibraries}
                    setCreateLibraryTab={setCreateLibraryTab}
                    handleBackToCreateLibrary={handleBackToCreateLibrary}
                    onLockedSourceClick={loginWithGoogle}
                    sidebarContent={
                      createLeftTab === "settings" ? (
                        <RoomSetupSidebarSummary
                          roomNameInput={roomNameInput}
                          roomVisibilityInput={roomVisibilityInput}
                          parsedMaxPlayers={parsedMaxPlayers}
                          questionCount={questionCount}
                          selectedCreateSourceSummary={
                            selectedCreateSourceSummary
                          }
                          isSourceSummaryLoading={isCreateSourceSummaryLoading}
                          createRequirementsHintText={
                            createRequirementsHintText
                          }
                          createRecommendationHintText={
                            createRecommendationHintText
                          }
                          canCreateRoom={canCreateRoom}
                          isCreatingRoom={isCreatingRoom}
                          onCreateRoom={() => {
                            void handleCreateRoom();
                          }}
                        />
                      ) : undefined
                    }
                  >
                    {createLeftTab === "settings" ? (
                      <div className="mb-3 flex items-center gap-1 lg:hidden">
                        <button
                          type="button"
                          onClick={handleBackToCreateLibrary}
                          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-cyan-100 transition hover:text-cyan-200"
                          aria-label="返回題庫來源"
                        >
                          <ChevronLeftRounded sx={{ fontSize: 24 }} />
                        </button>
                        <p className="text-base font-semibold tracking-[0.18em] text-[var(--mc-text)]">
                          房間設定
                        </p>
                      </div>
                    ) : null}
                    <div
                      className={`flex min-h-0 flex-1 flex-col bg-[var(--mc-surface)]/10 lg:rounded-none lg:border-l lg:border-[var(--mc-border)]/45 lg:pl-5 ${
                        createLeftTab === "settings"
                          ? "overflow-y-auto pr-1"
                          : ""
                      }`}
                    >
                      {createLeftTab === "settings" ? (
                        <>
                          <RoomSetupPanel
                            roomNameInput={roomNameInput}
                            setRoomNameInput={setRoomNameInput}
                            roomVisibilityInput={roomVisibilityInput}
                            setRoomVisibilityInput={setRoomVisibilityInput}
                            roomPasswordInput={roomPasswordInput}
                            setRoomPasswordInput={setRoomPasswordInput}
                            setRoomMaxPlayersInput={setRoomMaxPlayersInput}
                            parsedMaxPlayers={parsedMaxPlayers}
                            questionCount={questionCount}
                            questionMin={questionMin}
                            questionMaxLimit={questionMaxLimit}
                            updateQuestionCount={updateQuestionCount}
                            playDurationSec={playDurationSec}
                            revealDurationSec={revealDurationSec}
                            startOffsetSec={startOffsetSec}
                            allowCollectionClipTiming={
                              allowCollectionClipTiming
                            }
                            updatePlayDurationSec={updatePlayDurationSec}
                            updateRevealDurationSec={updateRevealDurationSec}
                            updateStartOffsetSec={updateStartOffsetSec}
                            updateAllowCollectionClipTiming={
                              updateAllowCollectionClipTiming
                            }
                            supportsCollectionClipTiming={
                              supportsCollectionClipTiming
                            }
                            selectedCreateSourceSummary={
                              selectedCreateSourceSummary
                            }
                            isSourceSummaryLoading={
                              isCreateSourceSummaryLoading
                            }
                            createSettingsCards={createSettingsCards}
                            createRequirementsHintText={
                              createRequirementsHintText
                            }
                            createRecommendationHintText={
                              createRecommendationHintText
                            }
                            canCreateRoom={canCreateRoom}
                            isCreatingRoom={isCreatingRoom}
                            onCreateRoom={() => {
                              void handleCreateRoom();
                            }}
                          />
                          <div className="mt-4 lg:hidden">
                            <RoomSetupSidebarSummary
                              roomNameInput={roomNameInput}
                              roomVisibilityInput={roomVisibilityInput}
                              parsedMaxPlayers={parsedMaxPlayers}
                              questionCount={questionCount}
                              selectedCreateSourceSummary={
                                selectedCreateSourceSummary
                              }
                              isSourceSummaryLoading={
                                isCreateSourceSummaryLoading
                              }
                              createRequirementsHintText={
                                createRequirementsHintText
                              }
                              createRecommendationHintText={
                                createRecommendationHintText
                              }
                              canCreateRoom={canCreateRoom}
                              isCreatingRoom={isCreatingRoom}
                              onCreateRoom={() => {
                                void handleCreateRoom();
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                          {createLibraryTab !== "link" && (
                            <LibrarySourceToolbar
                              createLibraryTab={createLibraryTab}
                              publicLibrarySearchPanelRef={
                                publicLibrarySearchPanelRef
                              }
                              publicLibrarySearchActive={
                                publicLibrarySearchActive
                              }
                              createLibrarySearch={createLibrarySearch}
                              setCreateLibrarySearch={setCreateLibrarySearch}
                              collectionsLoading={collectionsLoading}
                              filteredCreateCollectionsLength={
                                filteredCreateCollections.length
                              }
                              filteredCreateYoutubePlaylistsLength={
                                filteredCreateYoutubePlaylists.length
                              }
                              createLibraryView={createLibraryView}
                              setCreateLibraryView={setCreateLibraryView}
                              togglePublicLibrarySearch={
                                togglePublicLibrarySearch
                              }
                              publicCollectionsSort={publicCollectionsSort}
                              setPublicCollectionsSort={
                                setPublicCollectionsSort
                              }
                            />
                          )}

                          {!canUseGoogleLibraries &&
                          (createLibraryTab === "personal" ||
                            createLibraryTab === "youtube") ? (
                            <div className="mt-2 rounded-xl border border-dashed border-slate-600/60 bg-slate-900/30 p-3 text-sm text-slate-300 sm:mt-3 sm:p-4">
                              <p className="text-sm text-slate-200">
                                私人收藏庫和從 Youtube
                                匯入清單需先登入，也可以直接點上方已鎖定的來源項目登入。
                              </p>
                              <div className="mt-1">
                                <Button
                                  variant="contained"
                                  onClick={loginWithGoogle}
                                  disabled={authLoading}
                                >
                                  {authLoading
                                    ? "登入中..."
                                    : "使用 Google 登入"}
                                </Button>
                              </div>
                            </div>
                          ) : createLibraryTab === "link" ? (
                            <PlaylistLinkSourceContent
                              playlistUrlTooltipMessage={
                                playlistUrlTooltipMessage
                              }
                              isPlaylistUrlFieldFocused={
                                isPlaylistUrlFieldFocused
                              }
                              setIsPlaylistUrlFieldFocused={
                                setIsPlaylistUrlFieldFocused
                              }
                              trimmedPlaylistUrlDraft={trimmedPlaylistUrlDraft}
                              showPlaylistUrlError={showPlaylistUrlError}
                              showPlaylistUrlWarning={showPlaylistUrlWarning}
                              playlistUrlDraft={playlistUrlDraft}
                              isLinkSourceActive={isLinkSourceActive}
                              handleActivateLinkSource={
                                handleActivateLinkSource
                              }
                              setPlaylistUrlDraft={setPlaylistUrlDraft}
                              playlistPreviewError={playlistPreviewError}
                              setPlaylistPreviewError={setPlaylistPreviewError}
                              linkPreviewLocked={linkPreviewLocked}
                              handlePreviewPlaylistByUrl={
                                handlePreviewPlaylistByUrl
                              }
                              playlistLoading={playlistLoading}
                              playlistUrlLooksValid={playlistUrlLooksValid}
                              handleClearPlaylistUrlInput={
                                handleClearPlaylistUrlInput
                              }
                              linkPlaylistTitle={linkPlaylistTitle}
                              linkPlaylistCount={linkPlaylistCount}
                              playlistItemsLength={playlistItems.length}
                              handlePickLinkSource={handlePickLinkSource}
                              linkPlaylistPreviewItems={
                                linkPlaylistPreviewItems
                              }
                              canAttemptPlaylistPreview={
                                canAttemptPlaylistPreview
                              }
                              linkPlaylistIssueSummary={
                                linkPlaylistIssueSummary
                              }
                              playlistPreviewMetaSkippedCount={
                                playlistPreviewMeta?.skippedCount ?? 0
                              }
                              PlaylistPreviewRow={PlaylistPreviewRow}
                              PlaylistIssueRow={PlaylistIssueRow}
                            />
                          ) : createLibraryTab === "youtube" ? (
                            <div className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-3">
                              <YoutubeSourceContent
                                youtubePlaylistsLoading={
                                  youtubePlaylistsLoading
                                }
                                createLibraryView={createLibraryView}
                                filteredCreateYoutubePlaylists={
                                  filteredCreateYoutubePlaylists
                                }
                                normalizedCreateLibrarySearch={
                                  normalizedCreateLibrarySearch
                                }
                                handleActivateLinkSource={
                                  handleActivateLinkSource
                                }
                                setCreateLibraryTab={setCreateLibraryTab}
                                createLibraryColumns={createLibraryColumns}
                                youtubeListRowHeight={youtubeListRowHeight}
                                renderYoutubeSkeletonCard={
                                  renderYoutubeSkeletonCard
                                }
                                renderYoutubeCard={renderYoutubeCard}
                                VirtualLibraryListRow={VirtualLibraryListRow}
                              />
                            </div>
                          ) : (
                            <div className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-3">
                              <CollectionsSourceContent
                                createLibraryTab={createLibraryTab}
                                createLibraryView={createLibraryView}
                                shouldShowCollectionSkeleton={
                                  shouldShowCollectionSkeleton
                                }
                                renderCollectionSkeletonCard={
                                  renderCollectionSkeletonCard
                                }
                                collectionsError={collectionsError}
                                filteredCreateCollections={
                                  filteredCreateCollections
                                }
                                normalizedCreateLibrarySearch={
                                  normalizedCreateLibrarySearch
                                }
                                setCreateLibraryTab={setCreateLibraryTab}
                                handleActivateLinkSource={
                                  handleActivateLinkSource
                                }
                                createLibraryScrollRef={createLibraryScrollRef}
                                handleCollectionGridScroll={
                                  handleCollectionGridScroll
                                }
                                createLibraryColumns={createLibraryColumns}
                                renderCollectionCard={renderCollectionCard}
                                collectionsLoading={collectionsLoading}
                                collectionsLoadingMore={collectionsLoadingMore}
                                collectionListRowCount={collectionListRowCount}
                                collectionListRowHeight={
                                  collectionListRowHeight
                                }
                                collectionsHasMore={collectionsHasMore}
                                loadMoreCollections={loadMoreCollections}
                                VirtualLibraryListRow={VirtualLibraryListRow}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </LibrarySourcePanel>
                </div>
              ) : (
                <JoinRoomPanel
                  joinEntryTab={joinEntryTab}
                  setJoinEntryTab={setJoinEntryTab}
                  directJoinError={directJoinError}
                  directJoinLoading={directJoinLoading}
                  normalizedDirectRoomCode={normalizedDirectRoomCode}
                  directRoomCodeInputRef={directRoomCodeInputRef}
                  isDirectRoomCodeFocused={isDirectRoomCodeFocused}
                  setIsDirectRoomCodeFocused={setIsDirectRoomCodeFocused}
                  directRoomCodeSlots={directRoomCodeSlots}
                  activeDirectRoomCodeIndex={activeDirectRoomCodeIndex}
                  setDirectRoomIdInput={setDirectRoomIdInput}
                  setDirectJoinPreviewRoom={setDirectJoinPreviewRoom}
                  setDirectJoinError={setDirectJoinError}
                  setDirectJoinNeedsPassword={setDirectJoinNeedsPassword}
                  normalizeRoomCodeInput={normalizeRoomCodeInput}
                  handleDirectJoinById={handleDirectJoinById}
                  resolvedDirectJoinRoom={resolvedDirectJoinRoom}
                  directJoinNeedsPassword={directJoinNeedsPassword}
                  joinPasswordFilter={joinPasswordFilter}
                  setJoinPasswordFilter={setJoinPasswordFilter}
                  joinStatusFilter={joinStatusFilter}
                  setJoinStatusFilter={setJoinStatusFilter}
                  joinSortMode={joinSortMode}
                  setJoinSortMode={setJoinSortMode}
                  filteredJoinRooms={filteredJoinRooms}
                  filteredJoinPlayerTotal={filteredJoinPlayerTotal}
                  siteOnlineCount={displayedSiteOnlineCount}
                  joinRoomsView={joinRoomsView}
                  setJoinRoomsView={setJoinRoomsView}
                  handleJoinRoomEntry={handleJoinRoomEntry}
                  roomRequiresPin={roomRequiresPin}
                  isRoomCurrentlyPlaying={isRoomCurrentlyPlaying}
                  getRoomStatusLabel={getRoomStatusLabel}
                  getRoomPlaylistLabel={getRoomPlaylistLabel}
                  formatRoomCodeDisplay={formatRoomCodeDisplay}
                  joinConfirmDialog={joinConfirmDialog}
                  closeJoinConfirmDialog={closeJoinConfirmDialog}
                  handleConfirmJoinInProgress={handleConfirmJoinInProgress}
                  passwordDialog={passwordDialog}
                  closePasswordDialog={closePasswordDialog}
                  passwordDraft={passwordDraft}
                  setPasswordDraft={setPasswordDraft}
                  handleConfirmJoinWithPassword={handleConfirmJoinWithPassword}
                />
              )}
            </div>

            <style>
              {`
              @keyframes guide-panel-enter {
                0% { opacity: 0; transform: translateY(8px) scale(0.995); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes skeleton-breathe {
                0% {
                  opacity: 0.52;
                  transform: scale(1);
                  filter: saturate(0.92);
                }
                50% {
                  opacity: 0.92;
                  transform: scale(1.015);
                  filter: saturate(1.08);
                }
                100% {
                  opacity: 0.58;
                  transform: scale(1);
                  filter: saturate(0.96);
                }
              }
              @keyframes skeleton-sheen {
                0% {
                  transform: translate3d(0, 0, 0) skewX(-22deg);
                  opacity: 0;
                }
                12% {
                  opacity: 0.28;
                }
                48% {
                  opacity: 0.82;
                }
                100% {
                  transform: translate3d(320%, 0, 0) skewX(-22deg);
                  opacity: 0;
                }
              }
            `}
            </style>
          </div>
        </section>
      )}
    </div>
  );
};

export default RoomsHubPage;
