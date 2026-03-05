import React, { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  Typography,
} from "@mui/material";

import type { YoutubePlaylist } from "../../model/RoomContext";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import SuggestionModeButtons from "./roomLobbySuggestionPanel/SuggestionModeButtons";
import SuggestionSourceFields from "./roomLobbySuggestionPanel/SuggestionSourceFields";
import SuggestionStatusMessages from "./roomLobbySuggestionPanel/SuggestionStatusMessages";
import type { SuggestType } from "./roomLobbySuggestionPanel/types";

export interface SuggestionPanelProps {
  collectionScope: "public" | "owner";
  onCollectionScopeChange: (scope: "public" | "owner") => void;
  collections: CollectionOption[];
  collectionsLoading: boolean;
  isGoogleAuthed: boolean;
  youtubePlaylists: YoutubePlaylist[];
  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  requestCollections: (scope: "public" | "owner") => void;
  requestYoutubePlaylists: (force?: boolean) => void;
  onSuggestPlaylist: (
    type: "collection" | "playlist",
    value: string,
    options?: {
      useSnapshot?: boolean;
      sourceId?: string | null;
      title?: string | null;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  extractPlaylistId: (url: string) => string | null;
}

const RoomLobbySuggestionPanel: React.FC<SuggestionPanelProps> = ({
  collectionScope,
  onCollectionScopeChange,
  collections,
  collectionsLoading,
  isGoogleAuthed,
  youtubePlaylists,
  youtubePlaylistsLoading,
  youtubePlaylistsError,
  requestCollections,
  requestYoutubePlaylists,
  onSuggestPlaylist,
  extractPlaylistId,
}) => {
  const [suggestType, setSuggestType] = useState<SuggestType>("playlist");
  const [suggestPlaylistUrl, setSuggestPlaylistUrl] = useState("");
  const [suggestCollectionId, setSuggestCollectionId] = useState<string | null>(
    null,
  );
  const [suggestYoutubePlaylistId, setSuggestYoutubePlaylistId] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null);
  const lastCollectionRequestScopeRef = useRef<"public" | "owner" | null>(null);
  const hasRequestedYoutubeRef = useRef(false);
  const cooldownTimerRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);
  const SUGGESTION_COOLDOWN_MS = 5000;
  const selectedSuggestCollection = collections.find(
    (item) => item.id === suggestCollectionId,
  );
  const isSuggestCollectionPrivate =
    selectedSuggestCollection?.visibility === "private";
  const isCooldownActive =
    typeof cooldownUntil === "number" && cooldownUntil > Date.now();
  const remainingCooldownSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - cooldownNow) / 1000))
    : 0;
  const isSuggestCollectionEmptyNotice =
    !collectionsLoading &&
    collections.length === 0 &&
    !(collectionScope === "owner" && !isGoogleAuthed);
  const suggestPlaylistPrimaryText = "貼上播放清單連結，將歌單推薦給房主。";
  const suggestCollectionPrimaryText = (() => {
    const scopeLabel = collectionScope === "public" ? "公開" : "私人";
    if (collectionScope === "owner" && !isGoogleAuthed) {
      return "請先登入 Google 才能使用私人收藏庫。";
    }
    if (collectionsLoading) {
      return `正在讀取${scopeLabel}收藏庫...`;
    }
    if (collections.length === 0) {
      return `目前沒有可用的${scopeLabel}收藏庫。`;
    }
    return `請選擇要推薦的${scopeLabel}收藏庫。`;
  })();
  const isSuggestYoutubeEmptyNotice =
    isGoogleAuthed &&
    !youtubePlaylistsLoading &&
    youtubePlaylists.length === 0 &&
    !youtubePlaylistsError;
  const isSuggestYoutubeMissingNotice = Boolean(
    youtubePlaylistsError &&
      (youtubePlaylistsError.toLowerCase().includes("youtube") ||
        youtubePlaylistsError.includes("YouTube")),
  );
  const visibleSuggestYoutubeError =
    youtubePlaylistsError && !isSuggestYoutubeMissingNotice
      ? youtubePlaylistsError
      : null;
  const suggestYoutubePrimaryText = (() => {
    if (!isGoogleAuthed) {
      return "請先登入 Google 以載入 YouTube 播放清單。";
    }
    if (youtubePlaylistsLoading) {
      return "正在讀取 YouTube 播放清單...";
    }
    if (isSuggestYoutubeMissingNotice) {
      return "目前尚未取得可用的 YouTube 播放清單。";
    }
    if (isSuggestYoutubeEmptyNotice) {
      return "你的帳號目前沒有可用的 YouTube 播放清單。";
    }
    return "選擇 YouTube 播放清單後即可送出推薦。";
  })();

  useEffect(() => {
    if (suggestType !== "collection") {
      return;
    }
    if (lastCollectionRequestScopeRef.current === collectionScope) {
      return;
    }
    lastCollectionRequestScopeRef.current = collectionScope;
    requestCollections(collectionScope);
  }, [collectionScope, requestCollections, suggestType]);

  useEffect(() => {
    if (suggestType !== "youtube") return;
    if (!isGoogleAuthed) return;
    if (hasRequestedYoutubeRef.current) return;
    hasRequestedYoutubeRef.current = true;
    requestYoutubePlaylists();
  }, [isGoogleAuthed, requestYoutubePlaylists, suggestType]);

  useEffect(() => {
    if (suggestType !== "youtube") {
      hasRequestedYoutubeRef.current = false;
    }
  }, [suggestType]);

  useEffect(() => {
    if (isGoogleAuthed) return;
    hasRequestedYoutubeRef.current = false;
  }, [isGoogleAuthed]);

  useEffect(() => {
    if (cooldownTimerRef.current) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (cooldownIntervalRef.current) {
      window.clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    if (!cooldownUntil) return;
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(null);
      setSuggestNotice(null);
      return;
    }
    setCooldownNow(Date.now());
    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 500);
    cooldownTimerRef.current = window.setTimeout(() => {
      setCooldownUntil(null);
      setSuggestNotice(null);
    }, remaining);
    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [cooldownUntil]);

  const clearSuggestError = () => {
    if (suggestError) {
      setSuggestError(null);
    }
  };

  const clearSuggestNoticeIfAllowed = () => {
    if (suggestNotice && !isCooldownActive) {
      setSuggestNotice(null);
    }
  };

  const handleSelectPlaylistMode = () => {
    setSuggestType("playlist");
    clearSuggestError();
  };

  const handleSelectPublicCollectionMode = () => {
    setSuggestType("collection");
    onCollectionScopeChange("public");
    setSuggestCollectionId(null);
    clearSuggestError();
  };

  const handleSelectOwnerCollectionMode = () => {
    setSuggestType("collection");
    onCollectionScopeChange("owner");
    setSuggestCollectionId(null);
    clearSuggestError();
  };

  const handleSelectYoutubeMode = () => {
    setSuggestType("youtube");
    clearSuggestError();
  };

  const handleSuggestPlaylistUrlChange = (value: string) => {
    setSuggestPlaylistUrl(value);
    clearSuggestError();
    clearSuggestNoticeIfAllowed();
  };

  const handleSuggestCollectionIdChange = (value: string | null) => {
    setSuggestCollectionId(value);
    clearSuggestError();
    clearSuggestNoticeIfAllowed();
  };

  const handleSuggestYoutubePlaylistIdChange = (value: string | null) => {
    setSuggestYoutubePlaylistId(value);
    clearSuggestError();
    clearSuggestNoticeIfAllowed();
  };

  const handleSubmitSuggestion = async () => {
    if (isCooldownActive) {
      const remaining = Math.max(
        1,
        Math.ceil(((cooldownUntil ?? Date.now()) - Date.now()) / 1000),
      );
      setSuggestNotice(`請等待 ${remaining}s 後再送出下一次推薦。`);
      return;
    }
    setIsSubmitting(true);
    setSuggestError(null);
    setSuggestNotice(null);
    try {
      let result: { ok: boolean; error?: string } | null = null;
      if (suggestType === "playlist") {
        const trimmed = suggestPlaylistUrl.trim();
        const playlistId = extractPlaylistId(trimmed);
        if (!playlistId) {
          setSuggestError("請輸入有效的 YouTube 播放清單 URL");
          setSuggestNotice(null);
          return;
        }
        result = await onSuggestPlaylist("playlist", trimmed, {
          useSnapshot: false,
          sourceId: playlistId,
        });
      } else if (suggestType === "youtube") {
        if (!suggestYoutubePlaylistId) {
          setSuggestError("請先選擇 YouTube 播放清單。");
          setSuggestNotice(null);
          return;
        }
        const selected = youtubePlaylists.find(
          (playlist) => playlist.id === suggestYoutubePlaylistId,
        );
        result = await onSuggestPlaylist("playlist", suggestYoutubePlaylistId, {
          useSnapshot: true,
          sourceId: suggestYoutubePlaylistId,
          title: selected?.title ?? null,
        });
      } else if (suggestCollectionId) {
        result = await onSuggestPlaylist("collection", suggestCollectionId, {
          useSnapshot: isSuggestCollectionPrivate,
          sourceId: suggestCollectionId,
          title: selectedSuggestCollection?.title ?? null,
        });
      }
      if (!result?.ok) {
        setSuggestError(result?.error ?? "提交推薦失敗");
        setSuggestNotice(null);
        return;
      }
      setCooldownUntil(Date.now() + SUGGESTION_COOLDOWN_MS);
      setSuggestNotice("推薦已送出");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Accordion
      disableGutters
      expanded
      className="border border-slate-800/80 bg-slate-950/40 room-lobby-suggestion-accordion"
    >
      <AccordionSummary>
        <Typography variant="subtitle2" className="text-slate-200">
          推薦歌單給房主
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <SuggestionModeButtons
            suggestType={suggestType}
            collectionScope={collectionScope}
            isSubmitting={isSubmitting}
            isGoogleAuthed={isGoogleAuthed}
            onSelectPlaylist={handleSelectPlaylistMode}
            onSelectPublicCollection={handleSelectPublicCollectionMode}
            onSelectOwnerCollection={handleSelectOwnerCollectionMode}
            onSelectYoutube={handleSelectYoutubeMode}
          />
          <SuggestionSourceFields
            suggestType={suggestType}
            suggestPlaylistPrimaryText={suggestPlaylistPrimaryText}
            suggestPlaylistUrl={suggestPlaylistUrl}
            onSuggestPlaylistUrlChange={handleSuggestPlaylistUrlChange}
            suggestCollectionPrimaryText={suggestCollectionPrimaryText}
            isSuggestCollectionEmptyNotice={isSuggestCollectionEmptyNotice}
            isGoogleAuthed={isGoogleAuthed}
            collectionScope={collectionScope}
            suggestCollectionId={suggestCollectionId}
            collections={collections}
            onSuggestCollectionIdChange={handleSuggestCollectionIdChange}
            suggestYoutubePrimaryText={suggestYoutubePrimaryText}
            isSuggestYoutubeEmptyNotice={isSuggestYoutubeEmptyNotice}
            isSuggestYoutubeMissingNotice={isSuggestYoutubeMissingNotice}
            visibleSuggestYoutubeError={visibleSuggestYoutubeError}
            suggestYoutubePlaylistId={suggestYoutubePlaylistId}
            youtubePlaylists={youtubePlaylists}
            onSuggestYoutubePlaylistIdChange={handleSuggestYoutubePlaylistIdChange}
            isSubmitting={isSubmitting}
          />
          <SuggestionStatusMessages
            suggestType={suggestType}
            suggestCollectionId={suggestCollectionId}
            isSuggestCollectionPrivate={isSuggestCollectionPrivate}
            suggestError={suggestError}
            suggestNotice={suggestNotice}
            isCooldownActive={isCooldownActive}
            remainingCooldownSeconds={remainingCooldownSeconds}
          />
          <Button
            size="small"
            variant="contained"
            disabled={
              isSubmitting ||
              isCooldownActive ||
              (suggestType === "playlist" && !suggestPlaylistUrl.trim()) ||
              (suggestType === "collection" && !suggestCollectionId) ||
              (suggestType === "youtube" && !suggestYoutubePlaylistId)
            }
            onClick={handleSubmitSuggestion}
          >
            {isSubmitting
              ? "送出中..."
              : isCooldownActive
                ? `冷卻 ${Math.max(1, remainingCooldownSeconds)}s`
                : "推薦給房主"}
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default RoomLobbySuggestionPanel;
