import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useContext } from "react";
import { Button, useMediaQuery } from "@mui/material";
import {
  AddCircleOutlineRounded,
  MeetingRoomRounded,
} from "@mui/icons-material";

import type { RoomSummary } from "@domain/room/types";
import { useAuth } from "@shared/auth/AuthContext";
import {
  useRoomSession,
  useRoomCreate,
  useRoomGame,
  useRoomDirectory,
  useSitePresence,
} from "@features/RoomSession";
import {
  useCollectionContent,
  useFilterAggregationsQuery,
  type CollectionEntry,
} from "@features/CollectionContent";
import FloatingChatWindow from "@features/RoomChat";
import {
  buildPlaylistIssueSummary,
  getPlaylistIssueTotal,
  PlaylistIssueSummaryDialog,
  usePlaylistSource,
} from "@features/PlaylistSource";
import { resolveCollectionPlayableRequirement } from "@features/RoomSession/model/playlistAvailability";
import {
  DEFAULT_BGM_VOLUME,
  SettingsModelContext,
} from "@features/Setting/model/settingsContext";
import { apiFetchRoomById } from "@domain/room/api";
import {
  API_URL,
  DEFAULT_PLAYBACK_EXTENSION_MODE,
  PLAYER_MAX,
  PLAYER_MIN,
  YOUTUBE_PLAYLIST_MIN_ITEM_COUNT,
} from "@domain/room/constants";
import { generateGuestUsername } from "@domain/room/guestUsername";
import type { PlaybackExtensionMode } from "@domain/room/types";
import { PlaylistPreviewRow } from "./components/source/PlaylistPreviewRows";
import JoinRoomPanel from "./components/join/JoinRoomPanel";
import LibrarySourcePanel from "./components/source/LibrarySourcePanel";
import LibrarySourceToolbar from "./components/source/LibrarySourceToolbar";
import CollectionsSourceContent from "./components/source/CollectionsSourceContent";
import CollectionFilterBar from "./components/source/CollectionFilterBar";
import CollectionCard from "./components/source/CollectionCard";
import CollectionDetailDrawer from "./components/source/CollectionDetailDrawer";
import SourceSetupDrawer from "./components/source/SourceSetupDrawer";
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
  DEFAULT_LEADERBOARD_MODE,
  DEFAULT_LEADERBOARD_VARIANT,
  DEFAULT_ROOM_PLAY_MODE,
  getLeaderboardProfileKey,
  getLeaderboardVariant,
  leaderboardVariants,
  type LeaderboardModeKey,
  type LeaderboardVariantKey,
  type RoomPlayMode,
} from "../model/leaderboardChallengeOptions";
import {
  buildCreateSettingsCards,
  buildSelectedCreateSourceSummary,
  formatDurationLabel,
  normalizeRoomCodeInput,
  formatRoomCodeDisplay,
  getRoomPlaylistLabel,
  getRoomStatusLabel,
  roomIsLeaderboardChallenge,
  roomRequiresPin,
  type SourceSummary,
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
const ROOM_HUB_SETUP_PREFERENCES_KEY = "roomHub:setupPreferences:v1";

type RoomHubSetupPreferences = {
  roomPlayMode?: RoomPlayMode;
  maxPlayers?: number;
  questionCount?: number;
  selectedLeaderboardMode?: LeaderboardModeKey;
  selectedLeaderboardVariant?: LeaderboardVariantKey;
  playDurationSec?: number;
  revealDurationSec?: number;
  startOffsetSec?: number;
  allowCollectionClipTiming?: boolean;
  playbackExtensionMode?: PlaybackExtensionMode;
};

type CollectionDetailDrawerState = {
  collectionId: string;
  collection: CollectionEntry;
  source: "manual" | "sharedLink";
} | null;

const mergeCollectionDetailWithLiveCache = (
  snapshot: CollectionEntry | null,
  live: CollectionEntry | null,
): CollectionEntry | null => {
  if (!snapshot) return live;
  if (!live || live.id !== snapshot.id) return snapshot;

  return {
    ...snapshot,
    ...live,
  };
};

const isRoomPlayMode = (value: unknown): value is RoomPlayMode =>
  value === "casual" || value === "leaderboard";

const isLeaderboardModeKey = (value: unknown): value is LeaderboardModeKey =>
  typeof value === "string" && value in leaderboardVariants;

const isLeaderboardVariantKey = (
  mode: LeaderboardModeKey,
  value: unknown,
): value is LeaderboardVariantKey =>
  typeof value === "string" &&
  leaderboardVariants[mode].some((variant) => variant.key === value);

const isPlaybackExtensionMode = (
  value: unknown,
): value is PlaybackExtensionMode =>
  value === "manual_vote" || value === "auto_once" || value === "disabled";

const readRoomHubSetupPreferences = (): RoomHubSetupPreferences | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ROOM_HUB_SETUP_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as RoomHubSetupPreferences)
      : null;
  } catch {
    return null;
  }
};

const writeRoomHubSetupPreferences = (preferences: RoomHubSetupPreferences) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ROOM_HUB_SETUP_PREFERENCES_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Best-effort device preference. Storage can be blocked or full.
  }
};

const RoomsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const settingsModel = useContext(SettingsModelContext);
  const bgmVolume = settingsModel?.bgmVolume ?? DEFAULT_BGM_VOLUME;
  const {
    username,
    handleSetUsername,
    loginWithGoogle,
    authLoading,
    authUser,
  } = useAuth();
  const { siteOnlineCount } = useSitePresence();
  const { currentRoom, isConnected, serverOffsetMs, setStatusText } =
    useRoomSession();
  const { rooms, viewerAccessByRoomId } = useRoomDirectory();
  const displayedSiteOnlineCount = siteOnlineCount ?? (isConnected ? 1 : null);
  const suggestedGuestUsername = useMemo(() => generateGuestUsername(), []);
  const {
    collections,
    collectionsLoading,
    collectionsLoadingMore,
    collectionsHasMore,
    collectionsTotalCount,
    collectionsError,
    collectionItemsError,
    collectionItemsLoading,
    collectionScope,
    publicCollectionsSort,
    setPublicCollectionsSort,
    collectionFavoriteUpdatingId,
    fetchCollections,
    fetchCollectionById,
    loadMoreCollections,
    toggleCollectionFavorite,
    loadCollectionItems,
  } = useCollectionContent();
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
  } = usePlaylistSource();
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
  const isDesktopLibraryLayout = useMediaQuery("(min-width:1024px)");
  const isLibraryGridWide = useMediaQuery("(min-width:640px)");
  const isLibraryGridFourColumn = useMediaQuery("(min-width:1536px)");
  const [guideMode, setGuideMode] = useState<"create" | "join">(() => {
    if (typeof window === "undefined") return "create";
    const stored = window.sessionStorage.getItem(GUIDE_MODE_STORAGE_KEY);
    return stored === "join" ? "join" : "create";
  });
  const [playlistIssueDialogOpen, setPlaylistIssueDialogOpen] = useState(false);
  const [detailDrawerState, setDetailDrawerState] =
    useState<CollectionDetailDrawerState>(null);

  // Filter state for the public library tab.
  // "selected*" = immediate UI state (chip highlight, active indicator).
  // "debounced*" = delayed values used for API calls — prevents a request per click.
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>([]);
  const [selectedSubTagKeys, setSelectedSubTagKeys] = useState<string[]>([]);
  const [debouncedCategoryKeys, setDebouncedCategoryKeys] = useState<string[]>([]);
  const [debouncedSubTagKeys, setDebouncedSubTagKeys] = useState<string[]>([]);

  const [isFilterPending, startFilterTransition] = useTransition();

  // Debounce filter key changes (same 280ms as search) so rapid chip clicks
  // only trigger a single API call after the user pauses.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedCategoryKeys(selectedCategoryKeys), 280);
    return () => window.clearTimeout(handle);
  }, [selectedCategoryKeys]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSubTagKeys(selectedSubTagKeys), 280);
    return () => window.clearTimeout(handle);
  }, [selectedSubTagKeys]);

  const handleSelectCategoryFilter = useCallback((key: string | null) => {
    startFilterTransition(() => {
      setSelectedCategoryKeys((current) => {
        if (key === null) return [];
        return current.includes(key)
          ? current.filter((item) => item !== key)
          : [...current, key];
      });
    });
  }, [startFilterTransition]);

  const handleSelectSubTagFilter = useCallback((key: string | null) => {
    startFilterTransition(() => {
      setSelectedSubTagKeys((current) => {
        if (key === null) return [];
        return current.includes(key)
          ? current.filter((item) => item !== key)
          : [...current, key];
      });
    });
  }, [startFilterTransition]);
  // Note: aggregations hook is declared further down (after createLibraryTab is in scope)

  const detailCollectionId = detailDrawerState?.collectionId ?? null;
  const detailCollectionOverride = detailDrawerState?.collection ?? null;

  const handleOpenCollectionDetailDrawer = useCallback(
    (
      collection: CollectionEntry,
      source: "manual" | "sharedLink" = "manual",
    ) => {
      setDetailDrawerState({
        collectionId: collection.id,
        collection,
        source,
      });
    },
    [],
  );
  const handleCloseCollectionDetailDrawer = useCallback(() => {
    const closingSharedCollectionId =
      detailDrawerState?.source === "sharedLink"
        ? detailDrawerState.collectionId
        : null;

    setDetailDrawerState(null);

    if (!closingSharedCollectionId) return;

    const nextParams = new URLSearchParams(searchParams);
    if (nextParams.get("sharedCollection") !== closingSharedCollectionId)
      return;

    nextParams.delete("sharedCollection");

    navigate(
      {
        pathname: "/rooms",
        search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      },
      { replace: true },
    );
  }, [detailDrawerState, navigate, searchParams]);
  const [sourceSetupDrawer, setSourceSetupDrawer] = useState<{
    kind: "youtube" | "link";
    summary: NonNullable<SourceSummary>;
  } | null>(null);
  const setupPreferencesHydrateAttemptedRef = useRef(false);
  const [roomPlayMode, setRoomPlayMode] = useState<RoomPlayMode>(
    DEFAULT_ROOM_PLAY_MODE,
  );
  const [isPinProtectionEnabled, setIsPinProtectionEnabled] = useState(false);
  const [pinValidationAttempted, setPinValidationAttempted] = useState(false);
  const [playbackExtensionMode, setPlaybackExtensionMode] =
    useState<PlaybackExtensionMode>(DEFAULT_PLAYBACK_EXTENSION_MODE);
  const [setupPreferencesHydrated, setSetupPreferencesHydrated] =
    useState(false);
  const [selectedLeaderboardMode, setSelectedLeaderboardMode] =
    useState<LeaderboardModeKey>(DEFAULT_LEADERBOARD_MODE);
  const [selectedLeaderboardVariant, setSelectedLeaderboardVariant] =
    useState<LeaderboardVariantKey>(DEFAULT_LEADERBOARD_VARIANT);
  const [pendingLeaderboardStart, setPendingLeaderboardStart] = useState<{
    collectionId: string;
    profileKey: string;
  } | null>(null);
  const [pendingCustomRoomStart, setPendingCustomRoomStart] = useState<{
    collectionId: string;
  } | null>(null);
  const [pendingGuestRoomCreate, setPendingGuestRoomCreate] = useState(false);
  const [pendingGuestJoinRoom, setPendingGuestJoinRoom] = useState<{
    roomCode: string;
    roomName: string;
    hasPassword: boolean;
    pin?: string;
  } | null>(null);
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
    const next = (Array.isArray(rooms) ? [...rooms] : []).filter((room) => {
      if (room.maxPlayers === 1) return false;
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
  const playlistIssueSummary = useMemo(
    () => buildPlaylistIssueSummary(playlistPreviewMeta),
    [playlistPreviewMeta],
  );
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
    fetchCollectionById,
    openCollectionDrawer: handleOpenCollectionDetailDrawer,
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
  const linkPlaylistIssueTotal = useMemo(
    () => getPlaylistIssueTotal(linkPlaylistIssueSummary),
    [linkPlaylistIssueSummary],
  );
  const handlePickLinkSourceForDrawer = () => {
    handlePickLinkSource();
    setCreateLeftTab("library");
    setRoomPlayMode("casual");
    updateAllowCollectionClipTiming(false);
    setSourceSetupDrawer({
      kind: "link",
      summary: {
        label: "清單連結",
        title: linkPlaylistTitle || "播放清單",
        detail: `${linkPlaylistCount} 首曲目`,
        thumbnail: linkPlaylistPreviewItems[0]?.thumbnail || "",
      },
    });
  };
  const handleCreatePublicCollection = useCallback(() => {
    navigate("/collections/new", {
      state: {
        from: "roomHub",
        intent: "createPublicCollection",
      },
    });
  }, [navigate]);
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
  const pinInvalid =
    isPinProtectionEnabled && !/^\d{4}$/.test(roomPasswordInput.trim());
  const selectedLeaderboardMinimumQuestionCount = getLeaderboardVariant(
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  ).minQuestionCount;
  const leaderboardQuestionCountInvalid =
    roomPlayMode === "leaderboard" &&
    playlistItems.length < selectedLeaderboardMinimumQuestionCount;
  const canCreateRoom =
    Boolean(roomNameInput.trim()) &&
    playlistItems.length >= questionMin &&
    !leaderboardQuestionCountInvalid &&
    !playlistLoading &&
    !maxPlayersInvalid &&
    !isCreatingRoom;

  useEffect(() => {
    if (setupPreferencesHydrateAttemptedRef.current) return;
    setupPreferencesHydrateAttemptedRef.current = true;

    const preferences = readRoomHubSetupPreferences();
    if (!preferences) {
      setSetupPreferencesHydrated(true);
      return;
    }

    if (isRoomPlayMode(preferences.roomPlayMode)) {
      setRoomPlayMode(preferences.roomPlayMode);
    }
    if (
      typeof preferences.maxPlayers === "number" &&
      Number.isInteger(preferences.maxPlayers) &&
      preferences.maxPlayers >= PLAYER_MIN &&
      preferences.maxPlayers <= PLAYER_MAX
    ) {
      setRoomMaxPlayersInput(String(preferences.maxPlayers));
    }
    if (
      typeof preferences.questionCount === "number" &&
      Number.isFinite(preferences.questionCount)
    ) {
      updateQuestionCount(preferences.questionCount);
    }
    if (isLeaderboardModeKey(preferences.selectedLeaderboardMode)) {
      const nextMode = preferences.selectedLeaderboardMode;
      setSelectedLeaderboardMode(nextMode);
      if (
        isLeaderboardVariantKey(
          nextMode,
          preferences.selectedLeaderboardVariant,
        )
      ) {
        setSelectedLeaderboardVariant(preferences.selectedLeaderboardVariant);
      } else {
        setSelectedLeaderboardVariant(leaderboardVariants[nextMode][0].key);
      }
    }
    if (
      typeof preferences.playDurationSec === "number" &&
      Number.isFinite(preferences.playDurationSec)
    ) {
      updatePlayDurationSec(preferences.playDurationSec);
    }
    if (
      typeof preferences.revealDurationSec === "number" &&
      Number.isFinite(preferences.revealDurationSec)
    ) {
      updateRevealDurationSec(preferences.revealDurationSec);
    }
    if (
      typeof preferences.startOffsetSec === "number" &&
      Number.isFinite(preferences.startOffsetSec)
    ) {
      updateStartOffsetSec(preferences.startOffsetSec);
    }
    if (typeof preferences.allowCollectionClipTiming === "boolean") {
      updateAllowCollectionClipTiming(preferences.allowCollectionClipTiming);
    }
    if (isPlaybackExtensionMode(preferences.playbackExtensionMode)) {
      setPlaybackExtensionMode(preferences.playbackExtensionMode);
    }

    setSetupPreferencesHydrated(true);
  }, [
    setRoomMaxPlayersInput,
    setRoomVisibilityInput,
    updateAllowCollectionClipTiming,
    updatePlayDurationSec,
    updateQuestionCount,
    updateRevealDurationSec,
    updateStartOffsetSec,
  ]);

  useEffect(() => {
    if (!setupPreferencesHydrated) return;

    writeRoomHubSetupPreferences({
      roomPlayMode,
      maxPlayers: parsedMaxPlayers ?? undefined,
      questionCount,
      selectedLeaderboardMode,
      selectedLeaderboardVariant,
      playDurationSec,
      revealDurationSec,
      startOffsetSec,
      allowCollectionClipTiming,
      playbackExtensionMode,
    });
  }, [
    allowCollectionClipTiming,
    parsedMaxPlayers,
    playbackExtensionMode,
    playDurationSec,
    questionCount,
    revealDurationSec,
    roomPlayMode,
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
    setupPreferencesHydrated,
    startOffsetSec,
  ]);

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
  const detailCollection = useMemo(() => {
    if (!detailCollectionId) return null;

    const liveCollection =
      collections.find((item) => item.id === detailCollectionId) ?? null;

    return mergeCollectionDetailWithLiveCache(
      detailCollectionOverride?.id === detailCollectionId
        ? detailCollectionOverride
        : null,
      liveCollection,
    );
  }, [collections, detailCollectionId, detailCollectionOverride]);
  const selectedSharedCollection =
    selectedCreateCollectionId &&
    sharedCollectionMeta?.id === selectedCreateCollectionId
      ? sharedCollectionMeta
      : null;
  const normalizedCreateLibrarySearch = createLibrarySearch
    .trim()
    .toLowerCase();
  const [debouncedPublicLibrarySearch, setDebouncedPublicLibrarySearch] =
    useState(createLibrarySearch);

  useEffect(() => {
    if (createLibraryTab !== "public") {
      setDebouncedPublicLibrarySearch(createLibrarySearch);
      return;
    }
    const handle = window.setTimeout(() => {
      setDebouncedPublicLibrarySearch(createLibrarySearch);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [createLibrarySearch, createLibraryTab]);

  // Server-authoritative cross-dimensional filter counts (only on public tab).
  // Uses debounced filter keys so rapid chip clicks don't trigger repeated queries.
  const filterAggregationsQuery = useFilterAggregationsQuery({
    apiUrl: API_URL,
    visibility: "public",
    q: debouncedPublicLibrarySearch.trim() || undefined,
    categoryKeys: debouncedCategoryKeys,
    subTags: debouncedSubTagKeys,
    enabled: createLibraryTab === "public",
  });

  const filteredCreateYoutubePlaylists = useMemo(() => {
    if (!normalizedCreateLibrarySearch) return youtubePlaylists;
    return youtubePlaylists.filter((playlist) =>
      playlist.title.toLowerCase().includes(normalizedCreateLibrarySearch),
    );
  }, [normalizedCreateLibrarySearch, youtubePlaylists]);
  /**
   * Public tab: server already filtered by category/sub_tag — pass through directly.
   * Personal tab: client-side text search over the small owner list.
   */
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
  const createCollectionsTotalCount =
    createLibraryTab === "public" ||
    (createLibraryTab === "personal" && !normalizedCreateLibrarySearch)
      ? collectionsTotalCount
      : null;
  const mobileSourceCountLabel =
    createLibraryTab === "link"
      ? linkPlaylistCount > 0
        ? `${linkPlaylistCount} 筆`
        : null
      : createLibraryTab === "youtube"
        ? `${filteredCreateYoutubePlaylists.length} 筆`
        : collectionsLoading
          ? "載入中"
          : `${createCollectionsTotalCount ?? filteredCreateCollections.length} 筆`;
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
        : leaderboardQuestionCountInvalid
          ? `這個排行規格至少需要 ${selectedLeaderboardMinimumQuestionCount} 題，目前只有 ${playlistItems.length} 題。`
          : maxPlayersInvalid
            ? `玩家上限需介於 ${PLAYER_MIN}-${PLAYER_MAX} 人之間。`
            : null;
  const createRecommendationHintText =
    !createRequirementsHintText &&
    playlistItems.length >= questionMin &&
    playlistItems.length < 10
      ? "目前題數偏少，雖然可以建立房間，但建議至少準備 10 題，遊戲體驗會更完整。"
      : null;
  const handleRoomPlayModeChange = (nextMode: RoomPlayMode) => {
    setRoomPlayMode(nextMode);
  };
  const handleLeaderboardModeChange = (nextMode: LeaderboardModeKey) => {
    const nextVariant = leaderboardVariants[nextMode][0];
    setSelectedLeaderboardMode(nextMode);
    setSelectedLeaderboardVariant(nextVariant.key);
  };
  const handleLeaderboardVariantChange = (
    nextVariant: LeaderboardVariantKey,
  ) => {
    setSelectedLeaderboardVariant(nextVariant);
  };
  const handleLeaderboardSelectionChange = (
    nextMode: LeaderboardModeKey,
    nextVariant: LeaderboardVariantKey,
  ) => {
    setSelectedLeaderboardMode(nextMode);
    setSelectedLeaderboardVariant(nextVariant);
  };
  useEffect(() => {
    if (!pinInvalid) {
      setPinValidationAttempted(false);
    }
  }, [pinInvalid]);
  const buildCreateRoomOptions = useCallback(
    (leaderboardProfileKey?: string | null) => ({
      ...(leaderboardProfileKey ? { leaderboardProfileKey } : {}),
      ...(leaderboardProfileKey === "time_attack_15m"
        ? { maxPlayersOverride: 1 }
        : {}),
      playbackExtensionMode,
    }),
    [playbackExtensionMode],
  );
  const canSubmitRoomCreate = () => {
    if (pinInvalid) {
      setPinValidationAttempted(true);
      return false;
    }
    return true;
  };
  const prepareGuestIdentity = useCallback(() => {
    if (username) return false;

    handleSetUsername(suggestedGuestUsername);
    if (!roomNameInput.trim() || roomNameInput.trim() === "未命名房間") {
      setRoomNameInput(`${suggestedGuestUsername}'s room`);
    }
    return true;
  }, [
    handleSetUsername,
    roomNameInput,
    setRoomNameInput,
    suggestedGuestUsername,
    username,
  ]);
  const ensureGuestIdentity = useCallback(() => {
    if (username) return true;
    prepareGuestIdentity();
    return false;
  }, [prepareGuestIdentity, username]);
  const handleCreateCasualRoomFromDrawer = () => {
    if (!canSubmitRoomCreate()) return;
    if (!ensureGuestIdentity()) {
      setPendingGuestRoomCreate(true);
      return;
    }
    if (!isConnected) {
      setPendingGuestRoomCreate(true);
      return;
    }
    setRoomPlayMode("casual");
    void handleCreateRoom(buildCreateRoomOptions());
  };
  useEffect(() => {
    if (!pendingGuestRoomCreate) return;
    if (!username) return;
    if (!isConnected) return;

    setPendingGuestRoomCreate(false);
    setRoomPlayMode("casual");
    void handleCreateRoom(buildCreateRoomOptions());
  }, [
    buildCreateRoomOptions,
    handleCreateRoom,
    isConnected,
    pendingGuestRoomCreate,
    username,
  ]);
  useEffect(() => {
    if (!pendingLeaderboardStart) return;
    if (collectionItemsLoading) return;
    if (collectionItemsError) {
      setPendingLeaderboardStart(null);
      return;
    }
    if (selectedCreateCollectionId !== pendingLeaderboardStart.collectionId) {
      return;
    }
    if (roomCreateSourceMode !== "publicCollection") return;
    if (playlistItems.length === 0) return;

    const profileKey = pendingLeaderboardStart.profileKey;
    setPendingLeaderboardStart(null);
    void handleCreateRoom(buildCreateRoomOptions(profileKey));
  }, [
    collectionItemsError,
    collectionItemsLoading,
    buildCreateRoomOptions,
    handleCreateRoom,
    pendingLeaderboardStart,
    playlistItems.length,
    roomCreateSourceMode,
    selectedCreateCollectionId,
  ]);
  useEffect(() => {
    if (!pendingCustomRoomStart) return;
    if (collectionItemsLoading) return;
    if (collectionItemsError) {
      setPendingCustomRoomStart(null);
      return;
    }
    if (selectedCreateCollectionId !== pendingCustomRoomStart.collectionId) {
      return;
    }
    if (
      roomCreateSourceMode !== "publicCollection" &&
      roomCreateSourceMode !== "privateCollection"
    ) {
      return;
    }
    if (playlistItems.length === 0) return;
    if (!ensureGuestIdentity()) return;
    if (!isConnected) return;

    setPendingCustomRoomStart(null);
    void handleCreateRoom(buildCreateRoomOptions());
  }, [
    collectionItemsError,
    collectionItemsLoading,
    buildCreateRoomOptions,
    handleCreateRoom,
    ensureGuestIdentity,
    isConnected,
    pendingCustomRoomStart,
    playlistItems.length,
    roomCreateSourceMode,
    selectedCreateCollectionId,
  ]);
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
  const isCreateSourceSummaryLoading =
    createLeftTab === "settings" &&
    !selectedCreateSourceSummary &&
    (roomCreateSourceMode === "link" || roomCreateSourceMode === "youtube"
      ? playlistLoading
      : collectionItemsLoading);
  const createLibraryColumns = isLibraryGridFourColumn
    ? 4
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
    const isTooSmall = playlist.itemCount < YOUTUBE_PLAYLIST_MIN_ITEM_COUNT;

    return (
      <YoutubePlaylistCard
        playlist={playlist}
        view={view}
        selected={selectedCreateYoutubeId === playlist.id}
        disabled={isTooSmall}
        disabledReason={
          isTooSmall
            ? `低於 ${YOUTUBE_PLAYLIST_MIN_ITEM_COUNT} 題，不能用於題庫`
            : null
        }
        onSelect={() => {
          if (isTooSmall) return;
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
    const suppressSharedLinkHighlight =
      detailDrawerState?.source === "sharedLink" &&
      detailDrawerState.collectionId === collection.id;
    const playableRequirement =
      resolveCollectionPlayableRequirement(collection);

    return (
      <CollectionCard
        collection={collection}
        view={view}
        selected={
          selectedCreateCollectionId === collection.id &&
          !suppressSharedLinkHighlight
        }
        disabled={playableRequirement.disabled}
        disabledReason={playableRequirement.reason}
        isPublicLibraryTab={createLibraryTab === "public"}
        isFavoriteUpdating={collectionFavoriteUpdatingId === collection.id}
        onSelect={() => {
          handleOpenCollectionDetailDrawer(collection, "manual");
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
      previousCreateLibraryTabRef.current = createLibraryTab;
      const fetchOptions = {
        query: debouncedPublicLibrarySearch,
        categoryKeys: debouncedCategoryKeys,
        subTags: debouncedSubTagKeys,
      };
      void fetchCollections("public", fetchOptions);
      return;
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
    debouncedPublicLibrarySearch,
    debouncedCategoryKeys,
    debouncedSubTagKeys,
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
    setDetailDrawerState(null);
    setSourceSetupDrawer(null);
  }, [createLibraryTab, guideMode]);

  const handlePickYoutubeSource = async (playlistId: string) => {
    const playlist = youtubePlaylists.find((item) => item.id === playlistId);
    if (playlist && playlist.itemCount < YOUTUBE_PLAYLIST_MIN_ITEM_COUNT) {
      return;
    }
    if (playlist) {
      setSourceSetupDrawer({
        kind: "youtube",
        summary: {
          label: "YouTube 播放清單",
          title: playlist.title,
          detail: `${playlist.itemCount} 首曲目`,
          thumbnail: playlist.thumbnail ?? "",
        },
      });
    }
    setRoomPlayMode("casual");
    updateAllowCollectionClipTiming(false);
    setRoomCreateSourceMode("youtube");
    setSelectedCreateYoutubeId(playlistId);
    setSelectedCreateCollectionId(null);
    setSharedCollectionMeta(null);
    await importYoutubePlaylist(playlistId);
  };
  const handlePickCollectionSource = async (
    collectionId: string,
    scope: "public" | "owner",
    options?: { keepDetailDrawerOpen?: boolean },
  ) => {
    if (!options?.keepDetailDrawerOpen) {
      setDetailDrawerState(null);
    }
    setRoomCreateSourceMode(
      scope === "public" ? "publicCollection" : "privateCollection",
    );
    setSelectedCreateCollectionId(collectionId);
    setSelectedCreateYoutubeId(null);
    setSharedCollectionMeta(null);
    if (!options?.keepDetailDrawerOpen) {
      setCreateLeftTab("settings");
    }
    await loadCollectionItems(collectionId, { force: true });
  };
  const handleBackToCreateLibrary = () => {
    setCreateLeftTab("library");
    setRoomPlayMode(DEFAULT_ROOM_PLAY_MODE);
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
    pin?: string,
  ) => {
    if (hasPassword) {
      openPasswordDialog(roomCode, roomName);
      return;
    }
    if (!ensureGuestIdentity()) {
      setPendingGuestJoinRoom({ roomCode, roomName, hasPassword, pin });
      return;
    }
    setJoinPasswordInput("");
    handleJoinRoom(roomCode, false, pin);
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
    if (!ensureGuestIdentity()) {
      setPendingGuestJoinRoom({
        roomCode: passwordDialog.roomId,
        roomName: passwordDialog.roomName,
        hasPassword: true,
        pin: trimmed,
      });
      closePasswordDialog();
      return;
    }
    setJoinPasswordInput(trimmed);
    handleJoinRoom(passwordDialog.roomId, true, trimmed);
    closePasswordDialog();
  };
  useEffect(() => {
    if (!pendingGuestJoinRoom) return;
    if (!username) return;
    if (!isConnected) return;

    setPendingGuestJoinRoom(null);
    setJoinPasswordInput(
      pendingGuestJoinRoom.hasPassword ? (pendingGuestJoinRoom.pin ?? "") : "",
    );
    handleJoinRoom(
      pendingGuestJoinRoom.roomCode,
      pendingGuestJoinRoom.hasPassword,
      pendingGuestJoinRoom.pin,
    );
  }, [
    handleJoinRoom,
    isConnected,
    pendingGuestJoinRoom,
    setJoinPasswordInput,
    username,
  ]);
  const handleJoinRoomEntry = (room: RoomSummary) => {
    const kickedUntil = viewerAccessByRoomId[room.id]?.kickedUntil;
    const now = Date.now() + serverOffsetMs;
    if (
      kickedUntil === null ||
      (typeof kickedUntil === "number" && kickedUntil > now)
    ) {
      setStatusText(
        typeof kickedUntil === "number"
          ? "你暫時無法加入這個房間，請等倒數結束後再試。"
          : "你已被此房間封鎖，無法加入。",
      );
      return;
    }
    if (roomIsLeaderboardChallenge(room) && !authUser) {
      loginWithGoogle();
      return;
    }
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
    const kickedUntil =
      viewerAccessByRoomId[resolvedDirectJoinRoom.id]?.kickedUntil;
    const now = Date.now() + serverOffsetMs;
    if (
      kickedUntil === null ||
      (typeof kickedUntil === "number" && kickedUntil > now)
    ) {
      setDirectJoinError(
        typeof kickedUntil === "number"
          ? "你暫時無法加入這個房間，請等倒數結束後再試。"
          : "你已被此房間封鎖，無法加入。",
      );
      return;
    }
    if (roomIsLeaderboardChallenge(resolvedDirectJoinRoom) && !authUser) {
      setDirectJoinError("排行挑戰需先登入才能加入。");
      loginWithGoogle();
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
  return (
    <div className="mx-auto flex h-full min-h-0 w-full flex-1 flex-col text-[var(--mc-text)]">
      {!currentRoom?.id && (
        <section className="flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col sm:p-5">
            <div className="sticky top-0 z-50 bg-[var(--mc-bg)] pb-2 lg:static lg:bg-transparent lg:pb-0">
              <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-bg)] p-1 shadow-[0_14px_30px_-28px_rgba(2,6,23,0.95)] lg:bg-[var(--mc-surface-strong)]/40 lg:shadow-none">
                <button
                  type="button"
                  className={`relative z-10 cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,color,transform,opacity] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 sm:py-4.5 lg:px-4 lg:py-4 ${
                    guideMode === "create"
                      ? "border-cyan-300/55 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(14,165,233,0.09))] text-cyan-50 shadow-[0_18px_34px_-28px_rgba(34,211,238,0.72)]"
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
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-[transform,background-color,border-color,color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-10 sm:rounded-2xl ${
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
                  className={`relative z-10 cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,color,transform,opacity] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 sm:py-4.5 lg:px-4 lg:py-4 ${
                    guideMode === "join"
                      ? "border-amber-300/55 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(245,158,11,0.1))] text-amber-50 shadow-[0_18px_34px_-28px_rgba(251,191,36,0.68)]"
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
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-[transform,background-color,border-color,color,box-shadow] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-10 sm:rounded-2xl ${
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

              {guideMode === "create" ? (
                <div className="mt-2 bg-[var(--mc-bg)] lg:hidden">
                  <LibrarySourceToolbar
                    createLibraryTab={createLibraryTab}
                    publicLibrarySearchPanelRef={publicLibrarySearchPanelRef}
                    publicLibrarySearchActive={publicLibrarySearchActive}
                    createLibrarySearch={createLibrarySearch}
                    setCreateLibrarySearch={setCreateLibrarySearch}
                    collectionsLoading={collectionsLoading}
                    filteredCreateCollectionsLength={
                      filteredCreateCollections.length
                    }
                    createCollectionsTotalCount={createCollectionsTotalCount}
                    filteredCreateYoutubePlaylistsLength={
                      filteredCreateYoutubePlaylists.length
                    }
                    createLibraryView={createLibraryView}
                    setCreateLibraryView={setCreateLibraryView}
                    togglePublicLibrarySearch={togglePublicLibrarySearch}
                    publicCollectionsSort={publicCollectionsSort}
                    setPublicCollectionsSort={setPublicCollectionsSort}
                    canUseGoogleLibraries={canUseGoogleLibraries}
                    setCreateLibraryTab={setCreateLibraryTab}
                    onLockedSourceClick={loginWithGoogle}
                    mobileSourceMeta={mobileSourceCountLabel ?? undefined}
                    mobileEmbedded
                    filterContent={
                      createLibraryTab === "public" ? (
                          <CollectionFilterBar
                            aggregations={filterAggregationsQuery.data}
                          isLoading={
                            filterAggregationsQuery.isFetching ||
                            isFilterPending
                          }
                          selectedCategoryKeys={selectedCategoryKeys}
                          selectedSubTagKeys={selectedSubTagKeys}
                          onSelectCategory={handleSelectCategoryFilter}
                          onSelectSubTag={handleSelectSubTagFilter}
                        />
                      ) : undefined
                    }
                    activeFilterCount={
                      selectedCategoryKeys.length + selectedSubTagKeys.length
                    }
                  />
                </div>
              ) : null}
            </div>

            <div
              key={`guide-panel-${guideMode}`}
              className="flex min-h-0 flex-1 flex-col animate-[guide-panel-enter_220ms_ease-out] sm:mt-2"
            >
              {guideMode === "create" ? (
                <div className="flex min-h-0 flex-1 flex-col lg:rounded-2xl lg:border lg:border-[var(--mc-border)] lg:p-4">
                  <LibrarySourcePanel
                    createLeftTab="library"
                    createLibraryTab={createLibraryTab}
                    canUseGoogleLibraries={canUseGoogleLibraries}
                    setCreateLibraryTab={setCreateLibraryTab}
                    handleBackToCreateLibrary={handleBackToCreateLibrary}
                    onLockedSourceClick={loginWithGoogle}
                    showCreatePublicCollectionAction
                    onCreatePublicCollection={handleCreatePublicCollection}
                  >
                    <div className="flex min-h-0 flex-1 flex-col bg-[var(--mc-surface)]/10 lg:rounded-none lg:border-l lg:border-[var(--mc-border)]/45 lg:pl-5">
                      <div className="flex min-h-0 flex-1 flex-col">
                        {isDesktopLibraryLayout &&
                          createLibraryTab !== "link" && (
                          <div className="block">
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
                              createCollectionsTotalCount={
                                createCollectionsTotalCount
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
                              canUseGoogleLibraries={canUseGoogleLibraries}
                              setCreateLibraryTab={setCreateLibraryTab}
                              onLockedSourceClick={loginWithGoogle}
                              mobileSourceMeta={
                                mobileSourceCountLabel ?? undefined
                              }
                              filterContent={
                                createLibraryTab === "public" ? (
                                  <CollectionFilterBar
                                    aggregations={filterAggregationsQuery.data}
                                    isLoading={
                                      filterAggregationsQuery.isFetching ||
                                      isFilterPending
                                    }
                                    selectedCategoryKeys={selectedCategoryKeys}
                                    selectedSubTagKeys={selectedSubTagKeys}
                                    onSelectCategory={
                                      handleSelectCategoryFilter
                                    }
                                    onSelectSubTag={handleSelectSubTagFilter}
                                  />
                                ) : undefined
                              }
                              activeFilterCount={
                                selectedCategoryKeys.length +
                                selectedSubTagKeys.length
                              }
                            />
                          </div>
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
                                {authLoading ? "登入中..." : "使用 Google 登入"}
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
                            handleActivateLinkSource={handleActivateLinkSource}
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
                            handlePickLinkSource={handlePickLinkSourceForDrawer}
                            linkPlaylistPreviewItems={linkPlaylistPreviewItems}
                            canAttemptPlaylistPreview={
                              canAttemptPlaylistPreview
                            }
                            linkPlaylistIssueSummary={linkPlaylistIssueSummary}
                            linkPlaylistIssueTotal={linkPlaylistIssueTotal}
                            onOpenPlaylistIssueDialog={() =>
                              setPlaylistIssueDialogOpen(true)
                            }
                            playlistPreviewMetaSkippedCount={
                              playlistPreviewMeta?.skippedCount ?? 0
                            }
                            PlaylistPreviewRow={PlaylistPreviewRow}
                          />
                        ) : createLibraryTab === "youtube" ? (
                          <div className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-3">
                            <YoutubeSourceContent
                              youtubePlaylistsLoading={youtubePlaylistsLoading}
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
                              createLibraryColumns={createLibraryColumns}
                              renderCollectionCard={renderCollectionCard}
                              collectionsLoading={collectionsLoading}
                              collectionsLoadingMore={collectionsLoadingMore}
                              collectionListRowCount={collectionListRowCount}
                              collectionListRowHeight={collectionListRowHeight}
                              collectionsHasMore={collectionsHasMore}
                              loadMoreCollections={loadMoreCollections}
                              VirtualLibraryListRow={VirtualLibraryListRow}
                            />
                          </div>
                        )}
                      </div>
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
                  viewerAccessByRoomId={viewerAccessByRoomId}
                  serverOffsetMs={serverOffsetMs}
                  filteredJoinPlayerTotal={filteredJoinPlayerTotal}
                  siteOnlineCount={displayedSiteOnlineCount}
                  joinRoomsView={joinRoomsView}
                  setJoinRoomsView={setJoinRoomsView}
                  handleJoinRoomEntry={handleJoinRoomEntry}
                  onBlockedRoomClick={(room, label) => {
                    setStatusText(
                      label
                        ? `你暫時無法加入「${room.name}」，剩餘 ${label}。`
                        : `你已被「${room.name}」封鎖，無法加入。`,
                    );
                  }}
                  roomRequiresPin={roomRequiresPin}
                  roomIsLeaderboardChallenge={roomIsLeaderboardChallenge}
                  isRoomCurrentlyPlaying={isRoomCurrentlyPlaying}
                  getRoomStatusLabel={getRoomStatusLabel}
                  getRoomPlaylistLabel={getRoomPlaylistLabel}
                  formatRoomCodeDisplay={formatRoomCodeDisplay}
                  isAuthenticated={Boolean(authUser)}
                  isAuthLoading={authLoading}
                  onLoginRequired={loginWithGoogle}
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

            <FloatingChatWindow />

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
      <CollectionDetailDrawer
        key={detailCollectionId ?? "collection-detail-drawer"}
        open={Boolean(detailCollectionId)}
        collection={detailCollection}
        onClose={handleCloseCollectionDetailDrawer}
        isPublicLibraryTab={createLibraryTab === "public"}
        isApplying={collectionItemsLoading}
        isFavoriteUpdating={
          detailCollection
            ? collectionFavoriteUpdatingId === detailCollection.id
            : false
        }
        onUseCollection={(collectionId) => {
          void handlePickCollectionSource(
            collectionId,
            detailCollection?.visibility === "public" ? "public" : "owner",
          );
        }}
        onStartCustomRoom={() => {
          prepareGuestIdentity();
          setRoomPlayMode("casual");
        }}
        onConfirmCustomRoom={(collectionId) => {
          if (!canSubmitRoomCreate()) return;
          setPendingCustomRoomStart({ collectionId });
          setRoomPlayMode("casual");
          void handlePickCollectionSource(
            collectionId,
            detailCollection?.visibility === "public" ? "public" : "owner",
            { keepDetailDrawerOpen: true },
          );
        }}
        onStartLeaderboardChallenge={(collectionId) => {
          if (detailCollection?.visibility !== "public") return;
          if (!authUser) {
            loginWithGoogle();
            return;
          }
          setRoomPlayMode("leaderboard");
          void handlePickCollectionSource(
            collectionId,
            detailCollection?.visibility === "public" ? "public" : "owner",
          );
        }}
        onConfirmLeaderboardChallenge={(collectionId) => {
          if (detailCollection?.visibility !== "public") return;
          if (!authUser) {
            loginWithGoogle();
            return;
          }
          if (!canSubmitRoomCreate()) return;
          const profileKey = getLeaderboardProfileKey(
            selectedLeaderboardMode,
            selectedLeaderboardVariant,
          );
          setPendingLeaderboardStart({ collectionId, profileKey });
          setRoomPlayMode("leaderboard");
          void handlePickCollectionSource(collectionId, "public", {
            keepDetailDrawerOpen: true,
          });
        }}
        onToggleFavorite={
          detailCollection && createLibraryTab === "public"
            ? () => toggleCollectionFavorite(detailCollection.id)
            : undefined
        }
        formatDurationLabel={formatDurationLabel}
        roomNameInput={roomNameInput}
        setRoomNameInput={setRoomNameInput}
        roomVisibilityInput={roomVisibilityInput}
        setRoomVisibilityInput={setRoomVisibilityInput}
        roomPasswordInput={roomPasswordInput}
        setRoomPasswordInput={setRoomPasswordInput}
        isPinProtectionEnabled={isPinProtectionEnabled}
        setIsPinProtectionEnabled={setIsPinProtectionEnabled}
        pinValidationAttempted={pinValidationAttempted}
        setRoomMaxPlayersInput={setRoomMaxPlayersInput}
        parsedMaxPlayers={parsedMaxPlayers}
        questionCount={questionCount}
        questionMin={questionMin}
        questionMaxLimit={questionMaxLimit}
        updateQuestionCount={updateQuestionCount}
        roomPlayMode={roomPlayMode}
        setRoomPlayMode={handleRoomPlayModeChange}
        playDurationSec={playDurationSec}
        revealDurationSec={revealDurationSec}
        startOffsetSec={startOffsetSec}
        allowCollectionClipTiming={allowCollectionClipTiming}
        updatePlayDurationSec={updatePlayDurationSec}
        updateRevealDurationSec={updateRevealDurationSec}
        updateStartOffsetSec={updateStartOffsetSec}
        updateAllowCollectionClipTiming={updateAllowCollectionClipTiming}
        playbackExtensionMode={playbackExtensionMode}
        setPlaybackExtensionMode={setPlaybackExtensionMode}
        supportsCollectionClipTiming={supportsCollectionClipTiming}
        selectedCreateSourceSummary={selectedCreateSourceSummary}
        isSourceSummaryLoading={isCreateSourceSummaryLoading}
        createSettingsCards={createSettingsCards}
        createRequirementsHintText={createRequirementsHintText}
        createRecommendationHintText={createRecommendationHintText}
        canCreateRoom={canCreateRoom}
        isCreatingRoom={isCreatingRoom}
        isCustomRoomStartPending={Boolean(pendingCustomRoomStart)}
        isLeaderboardStartPending={Boolean(pendingLeaderboardStart)}
        selectedLeaderboardMode={selectedLeaderboardMode}
        selectedLeaderboardVariant={selectedLeaderboardVariant}
        onLeaderboardSelectionChange={handleLeaderboardSelectionChange}
        onLeaderboardModeChange={handleLeaderboardModeChange}
        onLeaderboardVariantChange={handleLeaderboardVariantChange}
        isAuthenticated={Boolean(authUser)}
        hasGuestIdentity={Boolean(username)}
        isAuthLoading={authLoading}
        onLoginRequired={loginWithGoogle}
      />
      <SourceSetupDrawer
        open={Boolean(sourceSetupDrawer)}
        kind={sourceSetupDrawer?.kind ?? null}
        sourceSummary={
          sourceSetupDrawer?.summary ?? selectedCreateSourceSummary
        }
        onClose={() => setSourceSetupDrawer(null)}
        roomNameInput={roomNameInput}
        setRoomNameInput={setRoomNameInput}
        roomVisibilityInput={roomVisibilityInput}
        setRoomVisibilityInput={setRoomVisibilityInput}
        roomPasswordInput={roomPasswordInput}
        setRoomPasswordInput={setRoomPasswordInput}
        isPinProtectionEnabled={isPinProtectionEnabled}
        setIsPinProtectionEnabled={setIsPinProtectionEnabled}
        pinValidationAttempted={pinValidationAttempted}
        setRoomMaxPlayersInput={setRoomMaxPlayersInput}
        parsedMaxPlayers={parsedMaxPlayers}
        questionCount={questionCount}
        questionMin={questionMin}
        questionMaxLimit={questionMaxLimit}
        updateQuestionCount={updateQuestionCount}
        setRoomPlayMode={handleRoomPlayModeChange}
        playDurationSec={playDurationSec}
        revealDurationSec={revealDurationSec}
        startOffsetSec={startOffsetSec}
        allowCollectionClipTiming={allowCollectionClipTiming}
        updatePlayDurationSec={updatePlayDurationSec}
        updateRevealDurationSec={updateRevealDurationSec}
        updateStartOffsetSec={updateStartOffsetSec}
        updateAllowCollectionClipTiming={updateAllowCollectionClipTiming}
        playbackExtensionMode={playbackExtensionMode}
        setPlaybackExtensionMode={setPlaybackExtensionMode}
        createSettingsCards={createSettingsCards}
        createRequirementsHintText={createRequirementsHintText}
        createRecommendationHintText={createRecommendationHintText}
        canCreateRoom={canCreateRoom}
        isCreatingRoom={isCreatingRoom}
        isSourceLoading={playlistLoading}
        selectedLeaderboardMode={selectedLeaderboardMode}
        selectedLeaderboardVariant={selectedLeaderboardVariant}
        onLeaderboardSelectionChange={handleLeaderboardSelectionChange}
        onCreateRoom={() => {
          handleCreateCasualRoomFromDrawer();
        }}
      />
      <PlaylistIssueSummaryDialog
        open={playlistIssueDialogOpen}
        onClose={() => setPlaylistIssueDialogOpen(false)}
        summary={linkPlaylistIssueSummary}
        total={linkPlaylistIssueTotal}
        description={`共 ${linkPlaylistIssueTotal} 首未能匯入房間清單`}
      />
    </div>
  );
};

export default RoomsHubPage;
