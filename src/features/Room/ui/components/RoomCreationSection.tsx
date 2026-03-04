import React from "react";
import {
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import LinkRounded from "@mui/icons-material/LinkRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlaylistPlayRounded from "@mui/icons-material/PlaylistPlayRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import StarBorderRounded from "@mui/icons-material/StarBorderRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import { List as VirtualList, type RowComponentProps } from "react-window";
import ConfirmDialog from "../../../../shared/ui/ConfirmDialog";

import type { RoomCreateSourceMode } from "../../model/RoomContext";
import type { PlaylistItem, RoomSummary } from "../../model/types";
import {
  PLAY_DURATION_MAX,
  PLAY_DURATION_MIN,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  START_OFFSET_MAX,
  START_OFFSET_MIN,
} from "../../model/roomConstants";
import QuestionCountControls from "./QuestionCountControls";
import RoomAccessSettingsFields from "./RoomAccessSettingsFields";

interface RoomCreationSectionProps {
  roomName: string;
  roomVisibility: "public" | "private";
  sourceMode: RoomCreateSourceMode;
  roomPassword: string;
  roomMaxPlayers: string;
  playlistUrl: string;
  playlistItems: PlaylistItem[];
  playlistLoading: boolean;
  playlistError: string | null;
  playlistStage: "input" | "preview";
  rooms: RoomSummary[];
  username: string | null;
  currentRoomId: string | null;
  joinPassword: string;
  playlistProgress: { received: number; total: number; ready: boolean };
  questionCount: number;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  onQuestionCountChange: (value: number) => void;
  onPlayDurationChange: (value: number) => void;
  onRevealDurationChange: (value: number) => void;
  onStartOffsetChange: (value: number) => void;
  onAllowCollectionClipTimingChange: (value: boolean) => void;
  questionMin?: number;
  questionMax?: number;
  questionStep?: number;
  playDurationMin?: number;
  playDurationMax?: number;
  revealDurationMin?: number;
  revealDurationMax?: number;
  startOffsetMin?: number;
  startOffsetMax?: number;
  questionControlsEnabled?: boolean;
  questionLimitLabel?: string;
  showRoomList?: boolean;
  youtubePlaylists?: { id: string; title: string; itemCount: number }[];
  youtubePlaylistsLoading?: boolean;
  youtubePlaylistsError?: string | null;
  collections?: Array<{
    id: string;
    title: string;
    description?: string | null;
    visibility?: "private" | "public";
    use_count?: number;
    favorite_count?: number;
    is_favorited?: boolean;
  }>;
  collectionsLoading?: boolean;
  collectionsError?: string | null;
  collectionScope?: "owner" | "public" | null;
  publicCollectionsSort?: "popular" | "favorites_first";
  onPublicCollectionsSortChange?: (next: "popular" | "favorites_first") => void;
  collectionFavoriteUpdatingId?: string | null;
  collectionsLastFetchedAt?: number | null;
  selectedCollectionId?: string | null;
  collectionItemsLoading?: boolean;
  collectionItemsError?: string | null;
  isGoogleAuthed?: boolean;
  onGoogleLogin?: () => void;
  onRoomNameChange: (value: string) => void;
  onRoomVisibilityChange: (value: "public" | "private") => void;
  onSourceModeChange: (mode: RoomCreateSourceMode) => void;
  onRoomPasswordChange: (value: string) => void;
  onRoomMaxPlayersChange: (value: string) => void;
  onJoinPasswordChange: (value: string) => void;
  onPlaylistUrlChange: (value: string) => void;
  onFetchPlaylist: (options?: {
    url?: string;
    force?: boolean;
    lock?: boolean;
  }) => void | Promise<void>;
  onFetchYoutubePlaylists?: () => void;
  onImportYoutubePlaylist?: (playlistId: string) => void;
  onFetchCollections?: (scope?: "owner" | "public") => void;
  onToggleCollectionFavorite?: (collectionId: string) => void | Promise<boolean>;
  onSelectCollection?: (collectionId: string | null) => void;
  onLoadCollectionItems?: (
    collectionId: string,
    options?: { readToken?: string | null; force?: boolean },
  ) => void;
  onJoinRoom: (roomId: string, hasPassword: boolean) => void;
  onStepChange?: (step: 1 | 2) => void;
  playerMin?: number;
  playerMax?: number;
}

const sourceModeOptions: Array<{
  mode: RoomCreateSourceMode;
  label: string;
  hint: string;
  icon: React.ElementType;
}> = [
  {
    mode: "link",
    label: "YouTube 連結",
    hint: "貼上播放清單網址，快速匯入",
    icon: LinkRounded,
  },
  {
    mode: "youtube",
    label: "我的播放清單",
    hint: "登入 Google 後直接選取",
    icon: PlaylistPlayRounded,
  },
  {
    mode: "publicCollection",
    label: "公開收藏庫",
    hint: "從社群收藏快速套用",
    icon: PublicRounded,
  },
  {
    mode: "privateCollection",
    label: "私人收藏庫",
    hint: "使用自己的收藏內容",
    icon: LockRounded,
  },
];

const sourceModeLabelMap: Record<RoomCreateSourceMode, string> = {
  link: "YouTube 連結",
  youtube: "我的播放清單",
  publicCollection: "公開收藏庫",
  privateCollection: "私人收藏庫",
};

const maxPlayerQuickOptions = [4, 8, 12, 16];

const extractYoutubePlaylistId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    return parsed.searchParams.get("list")?.trim() ?? null;
  } catch {
    const match = trimmed.match(/[?&]list=([^&#]+)/);
    return match?.[1] ?? null;
  }
};

type PreviewVirtualRowProps = {
  items: PlaylistItem[];
  keyPrefix: string;
};

const PreviewVirtualRow = ({
  index,
  style,
  items,
  keyPrefix,
}: RowComponentProps<PreviewVirtualRowProps>) => {
  const item = items[index];
  if (!item) {
    return <div style={style} />;
  }

  return (
    <div
      style={style}
      className="room-create-preview-virtual-row"
      data-row-key={`${keyPrefix}-${index}`}
    >
      <div className="room-create-preview-item room-create-preview-item--virtual">
        <img
          src={item.thumbnail || "https://via.placeholder.com/96x54?text=Music"}
          alt={item.title}
          className="room-create-preview-thumb"
          loading="lazy"
        />
        <div className="room-create-preview-text">
          <div className="title">{item.title}</div>
          <div className="meta">
            {item.uploader || "未知上傳者"}
            {item.duration ? ` · ${item.duration}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

const RoomCreationSection: React.FC<RoomCreationSectionProps> = (props) => {
  const {
    roomName,
    roomVisibility,
    sourceMode,
    roomPassword,
    roomMaxPlayers,
    playlistUrl,
    playlistItems,
    playlistLoading,
    playlistError,
    playlistStage,
    username,
    playlistProgress,
    questionCount,
    playDurationSec,
    revealDurationSec,
    startOffsetSec,
    allowCollectionClipTiming,
    onQuestionCountChange,
    onPlayDurationChange,
    onRevealDurationChange,
    onStartOffsetChange,
    onAllowCollectionClipTimingChange,
    questionMin = 1,
    questionMax = 100,
    questionStep = 5,
    questionControlsEnabled = true,
    questionLimitLabel,
    playDurationMin = PLAY_DURATION_MIN,
    playDurationMax = PLAY_DURATION_MAX,
    revealDurationMin = REVEAL_DURATION_MIN,
    revealDurationMax = REVEAL_DURATION_MAX,
    startOffsetMin = START_OFFSET_MIN,
    startOffsetMax = START_OFFSET_MAX,
    youtubePlaylists = [],
    youtubePlaylistsLoading = false,
    youtubePlaylistsError = null,
    collections = [],
    collectionsLoading = false,
    collectionsError = null,
    collectionScope = null,
    publicCollectionsSort = "popular",
    onPublicCollectionsSortChange,
    collectionFavoriteUpdatingId = null,
    collectionsLastFetchedAt = null,
    selectedCollectionId = null,
    collectionItemsLoading = false,
    collectionItemsError = null,
    isGoogleAuthed = false,
    onGoogleLogin,
    onRoomNameChange,
    onRoomVisibilityChange,
    onSourceModeChange,
    onRoomPasswordChange,
    onRoomMaxPlayersChange,
    onPlaylistUrlChange,
    onFetchPlaylist,
    onFetchYoutubePlaylists,
    onImportYoutubePlaylist,
    onFetchCollections,
    onToggleCollectionFavorite,
    onSelectCollection,
    onLoadCollectionItems,
    onStepChange,
    playerMin = 1,
    playerMax = 100,
  } = props;

  const [selectedYoutubeId, setSelectedYoutubeId] = React.useState("");

  const hasFetchedYoutubeRef = React.useRef(false);
  const [emptyCollectionScope, setEmptyCollectionScope] = React.useState<{
    public: boolean;
    owner: boolean;
  }>({
    public: false,
    owner: false,
  });
  const lastAutoLoadedCollectionRef = React.useRef<string | null>(null);
  const lastAutoFetchCollectionsKeyRef = React.useRef<string | null>(null);
  const confirmActionRef = React.useRef<null | (() => void)>(null);
  const [confirmModal, setConfirmModal] = React.useState<{
    title: string;
    detail?: string;
  } | null>(null);

  const normalizedMaxPlayersInput = roomMaxPlayers.trim();
  const parsedMaxPlayers = normalizedMaxPlayersInput
    ? Number(normalizedMaxPlayersInput)
    : null;
  const maxPlayersInvalid =
    parsedMaxPlayers !== null &&
    (!Number.isInteger(parsedMaxPlayers) ||
      parsedMaxPlayers < playerMin ||
      parsedMaxPlayers > playerMax);
  const selectedMaxPlayers = parsedMaxPlayers ?? 12;

  React.useEffect(() => {
    if (normalizedMaxPlayersInput) return;
    onRoomMaxPlayersChange("12");
  }, [normalizedMaxPlayersInput, onRoomMaxPlayersChange]);

  const canCreateRoom = Boolean(
    username &&
    roomName.trim() &&
    playlistItems.length > 0 &&
    !maxPlayersInvalid,
  );

  const previewItems = React.useMemo(() => playlistItems, [playlistItems]);
  const stageLabel = playlistStage === "preview" ? "預覽中" : "設定中";
  const sourceModeLabel = sourceModeLabelMap[sourceMode];
  const isCollectionSource =
    sourceMode === "publicCollection" || sourceMode === "privateCollection";
  const useCollectionTimingForSource =
    isCollectionSource && allowCollectionClipTiming;
  const createHelperText = React.useMemo(() => {
    if (playlistItems.length === 0) return "請先載入至少一首歌曲。";
    if (!roomName.trim()) return "請先填寫房間名稱。";
    if (maxPlayersInvalid) {
      return `人數限制需介於 ${playerMin} 到 ${playerMax} 人。`;
    }
    if (playlistLoading) return "歌曲仍在載入，完成後即可建立。";
    return "設定已完成，可以建立房間。";
  }, [
    maxPlayersInvalid,
    playerMax,
    playerMin,
    playlistItems.length,
    playlistLoading,
    roomName,
  ]);

  const targetCollectionScope =
    sourceMode === "privateCollection"
      ? "owner"
      : sourceMode === "publicCollection"
        ? "public"
        : null;
  const hasCollectionScopeMatch =
    targetCollectionScope !== null && collectionScope === targetCollectionScope;
  const collectionOptions = React.useMemo(
    () => (hasCollectionScopeMatch ? collections : []),
    [collections, hasCollectionScopeMatch],
  );

  const youtubeStatus = React.useMemo(() => {
    if (sourceMode !== "youtube") return null;
    if (!isGoogleAuthed) {
      return {
        tone: "info" as const,
        text: "需要先登入 Google 才能使用我的播放清單。",
      };
    }
    if (youtubePlaylistsLoading) {
      return {
        tone: "info" as const,
        text: "正在讀取你的 YouTube 播放清單...",
      };
    }
    if (youtubePlaylistsError) {
      return { tone: "error" as const, text: youtubePlaylistsError };
    }
    if (youtubePlaylists.length === 0) {
      return {
        tone: "info" as const,
        text: "尚未找到播放清單，請先在 YouTube 建立清單。",
      };
    }
    if (!selectedYoutubeId) {
      return { tone: "info" as const, text: "請先選擇播放清單。" };
    }
    return {
      tone: "success" as const,
      text: "已選擇播放清單，會自動載入歌曲。",
    };
  }, [
    isGoogleAuthed,
    selectedYoutubeId,
    sourceMode,
    youtubePlaylists.length,
    youtubePlaylistsError,
    youtubePlaylistsLoading,
  ]);

  const collectionStatus = React.useMemo(() => {
    const isCollectionMode =
      sourceMode === "publicCollection" || sourceMode === "privateCollection";
    if (!isCollectionMode) return null;
    const scopeLabel = sourceMode === "privateCollection" ? "私人" : "公開";
    const isEmptyCollectionError =
      collectionsError === "尚未建立收藏庫" ||
      collectionsError === "尚未建立公開收藏庫";
    const scopeKnownEmpty =
      sourceMode === "privateCollection"
        ? emptyCollectionScope.owner
        : emptyCollectionScope.public;
    if (sourceMode === "privateCollection" && !isGoogleAuthed) {
      return {
        tone: "info" as const,
        text: "需要先登入 Google 才能使用私人收藏庫。",
      };
    }
    if (collectionsLoading) {
      return { tone: "info" as const, text: `正在讀取${scopeLabel}收藏庫...` };
    }
    if (!hasCollectionScopeMatch) {
      if (scopeKnownEmpty) {
        return {
          tone: "error" as const,
          text: `目前沒有${scopeLabel}收藏庫，請先建立內容後再回來選擇。`,
        };
      }
      return { tone: "info" as const, text: `正在同步${scopeLabel}收藏庫...` };
    }
    if (collectionItemsLoading && selectedCollectionId) {
      return { tone: "info" as const, text: "正在載入收藏庫歌曲..." };
    }
    if (collectionItemsError) {
      return { tone: "error" as const, text: collectionItemsError };
    }
    if (collectionsError && !isEmptyCollectionError) {
      return { tone: "error" as const, text: collectionsError };
    }
    if (
      collectionOptions.length === 0 ||
      isEmptyCollectionError ||
      scopeKnownEmpty
    ) {
      return {
        tone: "error" as const,
        text: `目前沒有${scopeLabel}收藏庫，請先建立內容後再回來選擇。`,
      };
    }
    if (!selectedCollectionId) {
      return { tone: "info" as const, text: `請先選擇${scopeLabel}收藏庫。` };
    }
    return { tone: "success" as const, text: "已選擇收藏庫，會自動載入歌曲。" };
  }, [
    collectionOptions.length,
    collectionItemsError,
    collectionItemsLoading,
    collectionsError,
    collectionsLoading,
    emptyCollectionScope.owner,
    emptyCollectionScope.public,
    hasCollectionScopeMatch,
    isGoogleAuthed,
    selectedCollectionId,
    sourceMode,
  ]);

  const linkStatus = React.useMemo(() => {
    if (sourceMode !== "link") return null;
    if (playlistLoading) {
      return { tone: "info" as const, text: "正在匯入播放清單，請稍候..." };
    }
    if (playlistError) {
      return { tone: "error" as const, text: playlistError };
    }
    if (playlistItems.length > 0) {
      return {
        tone: "success" as const,
        text: `已完成匯入，共 ${playlistItems.length} 首歌曲。`,
      };
    }
    return { tone: "info" as const, text: "貼上播放清單網址後會自動匯入。" };
  }, [playlistError, playlistItems.length, playlistLoading, sourceMode]);

  React.useEffect(() => {
    if (sourceMode !== "youtube") return;
    if (!isGoogleAuthed || !onFetchYoutubePlaylists) return;
    if (hasFetchedYoutubeRef.current) return;
    hasFetchedYoutubeRef.current = true;
    void onFetchYoutubePlaylists();
  }, [isGoogleAuthed, onFetchYoutubePlaylists, sourceMode]);

  React.useEffect(() => {
    if (collectionScope === "public") {
      if (collections.length > 0) {
        setEmptyCollectionScope((prev) =>
          prev.public ? { ...prev, public: false } : prev,
        );
        return;
      }
      const nextEmpty = collectionsError === "尚未建立公開收藏庫";
      setEmptyCollectionScope((prev) =>
        prev.public === nextEmpty ? prev : { ...prev, public: nextEmpty },
      );
    }
    if (collectionScope === "owner") {
      if (collections.length > 0) {
        setEmptyCollectionScope((prev) =>
          prev.owner ? { ...prev, owner: false } : prev,
        );
        return;
      }
      const nextEmpty = collectionsError === "尚未建立收藏庫";
      setEmptyCollectionScope((prev) =>
        prev.owner === nextEmpty ? prev : { ...prev, owner: nextEmpty },
      );
    }
  }, [collectionScope, collections.length, collectionsError]);

  React.useEffect(() => {
    if (!onFetchCollections || collectionsLoading) return;
    const desiredScope =
      sourceMode === "publicCollection"
        ? "public"
        : sourceMode === "privateCollection"
          ? "owner"
          : null;
    if (!desiredScope) return;
    if (desiredScope === "owner" && !isGoogleAuthed) return;

    const fetchKey =
      desiredScope === "public"
        ? `public:${publicCollectionsSort}`
        : "owner";
    const isScopeLoaded =
      collectionScope === desiredScope && collectionsLastFetchedAt !== null;

    if (isScopeLoaded) {
      lastAutoFetchCollectionsKeyRef.current = fetchKey;
      return;
    }
    if (lastAutoFetchCollectionsKeyRef.current === fetchKey) {
      return;
    }

    lastAutoFetchCollectionsKeyRef.current = fetchKey;
    void onFetchCollections(desiredScope);
  }, [
    collectionScope,
    collectionsLoading,
    collectionsLastFetchedAt,
    isGoogleAuthed,
    onFetchCollections,
    publicCollectionsSort,
    sourceMode,
  ]);

  React.useEffect(() => {
    const isCollectionMode =
      sourceMode === "publicCollection" || sourceMode === "privateCollection";
    if (!isCollectionMode) return;
    if (!selectedCollectionId || !onLoadCollectionItems) return;
    if (lastAutoLoadedCollectionRef.current === selectedCollectionId) return;
    lastAutoLoadedCollectionRef.current = selectedCollectionId;
    void onLoadCollectionItems(selectedCollectionId);
  }, [onLoadCollectionItems, selectedCollectionId, sourceMode]);

  const openConfirmModal = React.useCallback(
    (title: string, detail: string, action: () => void) => {
      confirmActionRef.current = action;
      setConfirmModal({ title, detail });
    },
    [],
  );

  const closeConfirmModal = React.useCallback(() => {
    setConfirmModal(null);
    confirmActionRef.current = null;
  }, []);

  const handleConfirmSwitch = React.useCallback(() => {
    const action = confirmActionRef.current;
    closeConfirmModal();
    action?.();
  }, [closeConfirmModal]);

  const confirmBeforeReplace = React.useCallback(
    (targetLabel: string, action: () => void, title = "切換播放來源？") => {
      if (playlistItems.length === 0) {
        action();
        return;
      }
      openConfirmModal(
        title,
        `目前已載入 ${playlistItems.length} 首歌曲，確定要切換成「${targetLabel}」嗎？`,
        action,
      );
    },
    [openConfirmModal, playlistItems.length],
  );

  const handleSourceModeChange = (nextMode: RoomCreateSourceMode) => {
    if (nextMode === sourceMode) return;
    if (nextMode === "publicCollection" || nextMode === "privateCollection") {
      onSelectCollection?.(null);
      lastAutoLoadedCollectionRef.current = null;
    }
    if (nextMode !== "youtube") {
      setSelectedYoutubeId("");
    }
    onSourceModeChange(nextMode);
  };

  const handleFetchPlaylistByLink = React.useCallback(
    async (targetUrl?: string) => {
      const nextUrl = (targetUrl ?? playlistUrl).trim();
      if (!nextUrl) return;
      await Promise.resolve(
        onFetchPlaylist({
          url: nextUrl,
          force: true,
          lock: false,
        }),
      );
    },
    [onFetchPlaylist, playlistUrl],
  );

  const handlePlaylistPaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const pasted = event.clipboardData.getData("text").trim();
    if (!pasted) return;
    if (!extractYoutubePlaylistId(pasted)) return;
    event.preventDefault();
    onPlaylistUrlChange(pasted);
    confirmBeforeReplace(
      "YouTube 連結",
      () => {
        void handleFetchPlaylistByLink(pasted);
      },
      "切換到新的播放清單？",
    );
  };

  const handleYoutubeSelectionChange = (playlistId: string) => {
    const nextPlaylistId = playlistId || "";
    if (!nextPlaylistId) {
      setSelectedYoutubeId("");
      return;
    }
    if (nextPlaylistId === selectedYoutubeId) return;
    const targetTitle =
      youtubePlaylists.find((item) => item.id === nextPlaylistId)?.title ??
      "我的播放清單";
    confirmBeforeReplace(
      targetTitle,
      () => {
        setSelectedYoutubeId(nextPlaylistId);
        if (!onImportYoutubePlaylist) return;
        void onImportYoutubePlaylist(nextPlaylistId);
      },
      "切換到播放清單？",
    );
  };

  const handleCollectionSelectionChange = (collectionId: string) => {
    if (collectionItemsLoading) return;
    const nextCollectionId = collectionId || null;
    if (nextCollectionId === selectedCollectionId) return;
    const targetTitle =
      collectionOptions.find((item) => item.id === nextCollectionId)?.title ??
      "收藏庫";
    const applySelection = () => {
      onSelectCollection?.(nextCollectionId);
      if (!nextCollectionId || !onLoadCollectionItems) {
        lastAutoLoadedCollectionRef.current = null;
        return;
      }
      lastAutoLoadedCollectionRef.current = nextCollectionId;
      void onLoadCollectionItems(nextCollectionId);
    };
    if (!nextCollectionId) {
      applySelection();
      return;
    }
    confirmBeforeReplace(targetTitle, applySelection, "切換到收藏庫？");
  };

  const isSourceImporting = playlistLoading || collectionItemsLoading;
  const collectionSelectionDisabled =
    collectionsLoading || collectionItemsLoading;
  const importStatusText = React.useMemo(() => {
    if (sourceMode === "link") return "正在匯入 YouTube 播放清單...";
    if (sourceMode === "youtube") return "正在載入你的播放清單歌曲...";
    if (
      sourceMode === "publicCollection" ||
      sourceMode === "privateCollection"
    ) {
      return "正在套用收藏庫歌曲...";
    }
    return "正在載入歌曲...";
  }, [sourceMode]);
  const previewAnimationKey = `${sourceMode}-${selectedCollectionId ?? "none"}-${selectedYoutubeId}-${playlistItems.length}`;
  const baseStepReady = Boolean(roomName.trim()) && !maxPlayersInvalid;
  const sourceStepReady = playlistItems.length > 0;
  const questionRangeText = React.useMemo(() => {
    if (questionLimitLabel && questionLimitLabel.trim()) {
      return questionLimitLabel
        .replace(/^可調範圍\s*/u, "可調 ")
        .replace(/\s*-\s*/gu, "~");
    }
    return `可調 ${questionMin}~${questionMax}`;
  }, [questionLimitLabel, questionMax, questionMin]);
  const [activeStep, setActiveStep] = React.useState<1 | 2>(1);
  const [stepTransitionDirection, setStepTransitionDirection] = React.useState<
    "forward" | "backward"
  >("forward");
  const prevActiveStepRef = React.useRef<1 | 2>(1);

  const previewRowProps = React.useMemo<PreviewVirtualRowProps>(
    () => ({
      items: previewItems,
      keyPrefix: `${sourceMode}-${selectedCollectionId ?? "none"}-${selectedYoutubeId}`,
    }),
    [previewItems, selectedCollectionId, selectedYoutubeId, sourceMode],
  );
  const prevSourceStepReadyRef = React.useRef(false);

  React.useEffect(() => {
    if (!sourceStepReady) {
      setActiveStep((prev) => (prev === 1 ? prev : 1));
      return;
    }
  }, [sourceStepReady]);

  React.useEffect(() => {
    const wasReady = prevSourceStepReadyRef.current;
    const becameReady = sourceStepReady && !wasReady;
    prevSourceStepReadyRef.current = sourceStepReady;
    if (!becameReady || isSourceImporting) return;
    setActiveStep((prev) => (prev === 2 ? prev : 2));
  }, [isSourceImporting, sourceStepReady]);

  React.useEffect(() => {
    const previousStep = prevActiveStepRef.current;
    if (previousStep === activeStep) return;
    setStepTransitionDirection(
      activeStep > previousStep ? "forward" : "backward",
    );
    prevActiveStepRef.current = activeStep;
  }, [activeStep]);

  React.useEffect(() => {
    onStepChange?.(activeStep);
  }, [activeStep, onStepChange]);

  const stepItems = React.useMemo(
    () => [
      {
        id: 1 as const,
        label: "步驟 1",
        title: "選擇題庫",
        hint: "連結 / YouTube / 收藏庫",
        ready: sourceStepReady,
      },
      {
        id: 2 as const,
        label: "步驟 2",
        title: "基本設定",
        hint: "房名、權限、題數",
        ready:
          sourceStepReady &&
          baseStepReady &&
          canCreateRoom &&
          !isSourceImporting,
      },
    ],
    [baseStepReady, canCreateRoom, isSourceImporting, sourceStepReady],
  );

  const canOpenStep = React.useCallback(
    (step: 1 | 2) => {
      if (step === 1) return true;
      return sourceStepReady;
    },
    [sourceStepReady],
  );

  const activeSourceStatus =
    sourceMode === "link"
      ? linkStatus
      : sourceMode === "youtube"
        ? youtubeStatus
        : collectionStatus;

  const triggerLinkImport = React.useCallback(() => {
    const targetUrl = playlistUrl.trim();
    if (!targetUrl) return;
    confirmBeforeReplace(
      "YouTube 連結",
      () => {
        void handleFetchPlaylistByLink(targetUrl);
      },
      "載入這份播放清單？",
    );
  }, [confirmBeforeReplace, handleFetchPlaylistByLink, playlistUrl]);

  const renderPreviewPanel = React.useCallback(
    (panelKey: string) => (
      <Stack
        spacing={1}
        className="room-create-playlist-panel room-create-playlist-panel-preview room-create-v3-stage-panel room-create-v3-stage-panel--side"
      >
        <div className="room-create-preview-headline">
          <Typography variant="subtitle1" className="room-create-step-title">
            題庫預覽
          </Typography>
          <span className="room-create-question-badge">
            共 {playlistItems.length} 題
          </span>
        </div>
        <div
          className={`room-create-preview-stage${isSourceImporting ? " is-loading" : ""}`}
        >
          {playlistItems.length === 0 ? (
            <div className="room-create-preview-empty">尚未載入題庫</div>
          ) : (
            <div
              key={panelKey}
              className="room-create-preview-list room-create-preview-list--virtual room-create-preview-list--animated"
            >
              <VirtualList
                style={{ height: "100%", width: "100%" }}
                rowCount={previewItems.length}
                rowHeight={56}
                rowProps={previewRowProps}
                rowComponent={PreviewVirtualRow}
              />
            </div>
          )}

          {isSourceImporting && (
            <div
              className="room-create-preview-loading-mask"
              role="status"
              aria-live="polite"
            >
              <div className="room-create-preview-loading-content">
                <CircularProgress size={16} />
                <span>{importStatusText}</span>
              </div>
            </div>
          )}
        </div>
      </Stack>
    ),
    [
      importStatusText,
      isSourceImporting,
      playlistItems.length,
      previewItems.length,
      previewRowProps,
    ],
  );

  return (
    <Stack spacing={2.5} className="room-create-v3-flow">
      <div
        className="room-create-v3-guide-tabs"
        role="tablist"
        aria-label="建立房間步驟"
      >
        {stepItems.map((step) => {
          const isActive = activeStep === step.id;
          const locked = !canOpenStep(step.id);
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={locked}
              className={`room-create-v3-guide-tab ${isActive ? "is-active" : ""} ${
                step.ready ? "is-done" : ""
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <span className="room-create-v3-guide-label">{step.label}</span>
              <strong className="room-create-v3-guide-title">
                {step.title}
              </strong>
              <span className="room-create-v3-guide-hint">{step.hint}</span>
            </button>
          );
        })}
      </div>

      {activeStep === 2 && (
        <div
          className={`room-create-step-card room-create-v3-pane room-create-v3-pane--enter room-create-v3-pane--${stepTransitionDirection}`}
        >
          <div className="room-create-step-head">
            <div>
              <Typography variant="h5" className="room-create-step-title">
                步驟 2：基本設定
              </Typography>
              <Typography variant="body2" className="room-create-muted">
                題庫就緒後，再設定房名、規則與題數。
              </Typography>
            </div>
            <Chip
              size="small"
              className="room-create-visibility-chip"
              label={baseStepReady ? "已完成" : "進行中"}
            />
          </div>
          <div className="room-create-v3-pane-body">
            <div className="room-create-v3-stage-shell">
              <Stack
                spacing={1}
                className="room-create-playlist-panel room-create-v3-stage-panel room-create-v3-stage-panel--form"
              >
                <TextField
                  size="small"
                  label="房間名稱"
                  value={roomName}
                  onChange={(event) => onRoomNameChange(event.target.value)}
                  placeholder="例如：阿哲的 room"
                  fullWidth
                  className="room-create-field"
                />

                <RoomAccessSettingsFields
                  visibility={roomVisibility}
                  password={roomPassword}
                  onVisibilityChange={onRoomVisibilityChange}
                  onPasswordChange={onRoomPasswordChange}
                  onPasswordClear={() => onRoomPasswordChange("")}
                  allowPasswordWhenPublic
                  showClearButton={false}
                  classes={{
                    root: "room-create-access-block",
                    visibilityRow: "room-create-visibility-switch",
                    visibilityButton: "room-create-visibility-button",
                    helperText: "room-create-muted room-create-v3-helper-note",
                    passwordField: "room-create-field",
                    noteText: "room-create-muted room-create-v3-helper-note",
                  }}
                />

                <div className="room-create-field rounded-xl bg-[var(--mc-surface)]/38 p-2 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]">
                  <div className="mb-1.5 text-[11px] text-[var(--mc-text-muted)]">
                    最大人數（最多 16 人）
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {maxPlayerQuickOptions.map((count) => {
                      const isActive = selectedMaxPlayers === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => onRoomMaxPlayersChange(String(count))}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            isActive
                              ? "border-amber-300/70 bg-amber-400/15 text-amber-100"
                              : "border-[var(--mc-border)] bg-[var(--mc-surface)]/65 text-[var(--mc-text)] hover:border-amber-300/45"
                          }`}
                        >
                          {count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="room-create-question-card">
                  <div className="room-create-question-head">
                    <Typography
                      variant="subtitle1"
                      className="room-create-step-title"
                    >
                      題數設定
                    </Typography>
                    <div className="room-create-question-head-meta">
                      <span className="room-create-question-badge">
                        目前 {questionCount} 題
                      </span>
                      <span className="room-create-question-range">
                        {questionRangeText}
                      </span>
                    </div>
                  </div>
                  <QuestionCountControls
                    value={questionCount}
                    min={questionMin}
                    max={questionMax}
                    step={questionStep}
                    disabled={!questionControlsEnabled}
                    compact
                    showRangeHint={false}
                    onChange={onQuestionCountChange}
                  />
                </div>

                <Stack spacing={1} className="room-create-question-card">
                  <div className="room-create-question-head">
                    <Typography
                      variant="subtitle1"
                      className="room-create-step-title"
                    >
                      作答時間設定
                    </Typography>
                    <span className="room-create-question-badge">
                      {useCollectionTimingForSource
                        ? `揭曉 ${revealDurationSec}s（收藏庫片段）`
                        : `揭曉 ${revealDurationSec}s / 作答 ${playDurationSec}s / 起始 ${startOffsetSec}s`}
                    </span>
                  </div>
                  <TextField
                    size="small"
                    type="number"
                    label="公布答案時間 (秒)"
                    value={revealDurationSec}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      onRevealDurationChange(next);
                    }}
                    slotProps={{
                      htmlInput: {
                        min: revealDurationMin,
                        max: revealDurationMax,
                        inputMode: "numeric",
                      },
                    }}
                    fullWidth
                    className="room-create-field"
                  />
                  {isCollectionSource && (
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={allowCollectionClipTiming}
                          onChange={(_event, checked) =>
                            onAllowCollectionClipTimingChange(checked)
                          }
                        />
                      }
                      label="使用收藏庫設定的時間"
                      className="room-create-muted"
                    />
                  )}
                  {useCollectionTimingForSource ? (
                    <Typography variant="caption" className="room-create-muted">
                      已啟用收藏庫時間，作答時間與起始時間會自動套用歌單設定。
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.25}
                      >
                        <TextField
                          size="small"
                          type="number"
                          label="作答時間設定"
                          value={playDurationSec}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            onPlayDurationChange(next);
                          }}
                          slotProps={{
                            htmlInput: {
                              min: playDurationMin,
                              max: playDurationMax,
                              inputMode: "numeric",
                            },
                          }}
                          fullWidth
                          className="room-create-field"
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="起始時間 (秒)"
                          value={startOffsetSec}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            onStartOffsetChange(next);
                          }}
                          slotProps={{
                            htmlInput: {
                              min: startOffsetMin,
                              max: startOffsetMax,
                              inputMode: "numeric",
                            },
                          }}
                          fullWidth
                          className="room-create-field"
                        />
                      </Stack>
                      <Typography variant="caption" className="room-create-muted">
                        若超過歌曲長度，系統會依據起始時間做循環裁切。
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Stack>

              {renderPreviewPanel(`step2-${previewAnimationKey}`)}
            </div>
          </div>

          <Typography
            variant="caption"
            className="room-create-muted room-create-v3-pane-helper room-create-v3-step-tip room-create-v3-step-tip--ghost"
            aria-hidden="true"
          >
            {createHelperText}
          </Typography>
        </div>
      )}

      {activeStep === 1 && (
        <div
          className={`room-create-step-card room-create-v3-pane room-create-v3-pane--enter room-create-v3-pane--${stepTransitionDirection}`}
        >
          <div className="room-create-step-head">
            <div>
              <Typography variant="h5" className="room-create-step-title">
                步驟 1：選擇題庫
              </Typography>
              <Typography variant="body2" className="room-create-muted">
                先選來源並完成歌曲匯入，再進入題數與規則設定。
              </Typography>
            </div>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                variant="outlined"
                label={stageLabel}
                sx={{
                  borderColor: "rgba(148, 163, 184, 0.28)",
                  color: "var(--mc-text-muted)",
                  background: "rgba(2, 6, 23, 0.35)",
                }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`來源：${sourceModeLabel}`}
                sx={{
                  borderColor: "rgba(148, 163, 184, 0.28)",
                  color: "var(--mc-text-muted)",
                  background: "rgba(2, 6, 23, 0.35)",
                }}
              />
            </Stack>
          </div>

          <div className="room-create-v3-pane-body">
            <div className="room-create-v3-stage-shell">
              <Stack
                spacing={1.25}
                className="room-create-playlist-panel room-create-playlist-panel-controls room-create-v3-stage-panel room-create-v3-stage-panel--form"
              >
                <div className="room-create-source-grid">
                  {sourceModeOptions.map((option) => {
                    const isActive = sourceMode === option.mode;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.mode}
                        type="button"
                        className={`room-create-source-pill${isActive ? " is-active" : ""}`}
                        onClick={() => handleSourceModeChange(option.mode)}
                      >
                        <span className="label-row">
                          <span className="icon-wrap" aria-hidden="true">
                            <Icon fontSize="inherit" />
                          </span>
                          <span className="label">{option.label}</span>
                        </span>
                        <span className="hint">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {sourceMode === "link" && (
                  <Stack spacing={1.25}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.25}
                    >
                      <TextField
                        size="small"
                        fullWidth
                        label="YouTube 播放清單網址"
                        value={playlistUrl}
                        onChange={(event) =>
                          onPlaylistUrlChange(event.target.value)
                        }
                        onPaste={handlePlaylistPaste}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          triggerLinkImport();
                        }}
                        placeholder="https://www.youtube.com/playlist?list=..."
                        className="room-create-field"
                      />
                      <Button
                        variant="outlined"
                        onClick={triggerLinkImport}
                        disabled={!playlistUrl.trim() || playlistLoading}
                        className="room-create-link-load-button"
                      >
                        {playlistLoading ? "載入中..." : "載入清單"}
                      </Button>
                    </Stack>
                  </Stack>
                )}

                {sourceMode === "youtube" && (
                  <Stack spacing={1.25}>
                    {!isGoogleAuthed ? (
                      <Button
                        variant="outlined"
                        onClick={onGoogleLogin}
                        fullWidth
                      >
                        登入 Google
                      </Button>
                    ) : (
                      <>
                        <FormControl
                          size="small"
                          fullWidth
                          className="room-create-field"
                        >
                          <InputLabel id="room-create-youtube-playlist">
                            選擇清單
                          </InputLabel>
                          <Select
                            labelId="room-create-youtube-playlist"
                            label="選擇清單"
                            value={selectedYoutubeId}
                            onChange={(event) =>
                              handleYoutubeSelectionChange(
                                String(event.target.value),
                              )
                            }
                          >
                            <MenuItem value="">請選擇清單</MenuItem>
                            {youtubePlaylists.map((playlist) => (
                              <MenuItem key={playlist.id} value={playlist.id}>
                                {playlist.title}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </>
                    )}
                  </Stack>
                )}

                {(sourceMode === "publicCollection" ||
                  sourceMode === "privateCollection") && (
                  <Stack spacing={1.25}>
                    {sourceMode === "privateCollection" && !isGoogleAuthed ? (
                      <Button
                        variant="outlined"
                        onClick={onGoogleLogin}
                        fullWidth
                      >
                        登入 Google
                      </Button>
                    ) : (
                      <>
                        {sourceMode === "publicCollection" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="small"
                              variant={
                                publicCollectionsSort === "popular"
                                  ? "contained"
                                  : "outlined"
                              }
                              onClick={() =>
                                onPublicCollectionsSortChange?.("popular")
                              }
                            >
                              熱門
                            </Button>
                            <Button
                              size="small"
                              variant={
                                publicCollectionsSort === "favorites_first"
                                  ? "contained"
                                  : "outlined"
                              }
                              disabled={!isGoogleAuthed}
                              onClick={() =>
                                onPublicCollectionsSortChange?.("favorites_first")
                              }
                            >
                              收藏優先
                            </Button>
                            {!isGoogleAuthed && (
                              <Typography
                                variant="caption"
                                className="room-create-muted"
                              >
                                登入後可使用收藏優先排序
                              </Typography>
                            )}
                          </div>
                        )}
                        <FormControl
                          size="small"
                          fullWidth
                          className="room-create-field"
                        >
                          <InputLabel id="room-create-collection-select">
                            選擇收藏庫
                          </InputLabel>
                          <Select
                            labelId="room-create-collection-select"
                            label="選擇收藏庫"
                            value={
                              hasCollectionScopeMatch
                                ? (selectedCollectionId ?? "")
                                : ""
                            }
                            onChange={(event) =>
                              handleCollectionSelectionChange(
                                String(event.target.value),
                              )
                            }
                            disabled={collectionSelectionDisabled}
                          >
                            <MenuItem value="">請選擇收藏庫</MenuItem>
                            {collectionOptions.map((item) => (
                              <MenuItem key={item.id} value={item.id}>
                                <div className="flex w-full min-w-0 items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="block truncate">{item.title}</span>
                                    <span className="block text-[11px] text-slate-400">
                                      熱門 · 遊玩次數 {Math.max(0, Number(item.use_count ?? 0))}
                                    </span>
                                  </div>
                                  {sourceMode === "publicCollection" && (
                                    <span className="inline-flex shrink-0 items-center gap-1">
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        sx={{ color: "rgba(226,232,240,0.78)" }}
                                      >
                                        {Math.max(
                                          0,
                                          Number(item.favorite_count ?? 0),
                                        )}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        disabled={
                                          !isGoogleAuthed ||
                                          collectionFavoriteUpdatingId === item.id
                                        }
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                        }}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          void onToggleCollectionFavorite?.(item.id);
                                        }}
                                        sx={{
                                          p: 0.35,
                                          color: item.is_favorited
                                            ? "#facc15"
                                            : "rgba(226,232,240,0.65)",
                                        }}
                                        title={
                                          isGoogleAuthed
                                            ? item.is_favorited
                                              ? "取消收藏"
                                              : "收藏收藏庫"
                                            : "登入後可收藏"
                                        }
                                      >
                                        {item.is_favorited ? (
                                          <StarRounded fontSize="inherit" />
                                        ) : (
                                          <StarBorderRounded fontSize="inherit" />
                                        )}
                                      </IconButton>
                                    </span>
                                  )}
                                </div>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </>
                    )}
                  </Stack>
                )}

                {activeSourceStatus && (
                  <div
                    className={`room-create-v3-source-status room-create-v3-source-status--${activeSourceStatus.tone}`}
                  >
                    {activeSourceStatus.text}
                  </div>
                )}

                {isSourceImporting && (
                  <Stack spacing={0.75}>
                    <LinearProgress
                      variant={
                        playlistLoading && playlistProgress.total > 0
                          ? "determinate"
                          : "indeterminate"
                      }
                      value={
                        playlistLoading && playlistProgress.total > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (playlistProgress.received /
                                  playlistProgress.total) *
                                  100,
                              ),
                            )
                          : undefined
                      }
                    />
                    <Typography variant="caption" className="room-create-muted">
                      {playlistLoading && playlistProgress.total > 0
                        ? `已接收 ${playlistProgress.received} / ${playlistProgress.total}`
                        : importStatusText}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {renderPreviewPanel(`step1-${previewAnimationKey}`)}
            </div>
          </div>

          {sourceStepReady && !isSourceImporting ? (
            <div
              className="room-create-v3-step-ready-tip room-create-v3-step-tip"
              role="status"
              aria-live="polite"
            >
              題庫已準備完成，可點上方「步驟 2：基本設定」完成建房設定。
            </div>
          ) : (
            <Typography
              variant="caption"
              className="room-create-muted room-create-v3-step-tip"
            >
              請先載入至少一首歌曲，再切換至步驟 2。
            </Typography>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmModal)}
        title={confirmModal?.title ?? "切換播放來源"}
        description={confirmModal?.detail ?? "確定要切換嗎？"}
        confirmLabel="確認切換"
        cancelLabel="取消"
        onConfirm={handleConfirmSwitch}
        onCancel={closeConfirmModal}
      />
    </Stack>
  );
};

export default RoomCreationSection;
