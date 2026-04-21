import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@features/PlaylistSource";
import { collectionsApi } from "../../shared/api/collectionsApi";
import { buildEditableItems } from "../utils/editMappers";
import type { EditableItem } from "../utils/editTypes";
import {
  DEFAULT_DURATION_SEC,
  createLocalId,
  extractVideoId,
  extractYoutubeChannelId,
  formatSeconds,
  getPlaylistItemKey,
  parseDurationToSeconds,
  thumbnailFromId,
} from "../utils/editUtils";
import { DUPLICATE_SONG_ERROR } from "../utils/editConstants";

type SourceMode = "playlist" | "single";

type UseCollectionEditImportArgs = {
  authToken: string | null;
  playlistLoading: boolean;
  playlistError: string | null;
  fetchedPlaylistItems: PlaylistItem[];
  playlistItems: EditableItem[];
  handleFetchPlaylist: () => void | Promise<void>;
  handleResetPlaylist: () => void;
  appendItems: (
    incoming: EditableItem[],
    options?: { selectLast?: boolean; scrollToLast?: boolean },
  ) => { added: number; duplicates: number };
};

export function useCollectionEditImport({
  authToken,
  playlistLoading,
  playlistError,
  fetchedPlaylistItems,
  playlistItems,
  handleFetchPlaylist,
  handleResetPlaylist,
  appendItems,
}: UseCollectionEditImportArgs) {
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalMode, setSourceModalMode] =
    useState<SourceMode>("playlist");

  const [playlistAddError, setPlaylistAddError] = useState<string | null>(null);
  const [pendingPlaylistImport, setPendingPlaylistImport] = useState(false);

  const [singleTrackUrl, setSingleTrackUrl] = useState("");
  const [singleTrackTitle, setSingleTrackTitle] = useState("");
  const [singleTrackDuration, setSingleTrackDuration] = useState("");
  const [singleTrackAnswer, setSingleTrackAnswer] = useState("");
  const [singleTrackUploader, setSingleTrackUploader] = useState("");
  const [singleTrackChannelId, setSingleTrackChannelId] = useState("");
  const [singleTrackError, setSingleTrackError] = useState<string | null>(null);
  const [singleTrackLoading, setSingleTrackLoading] = useState(false);

  const lastResolvedUrlRef = useRef<string | null>(null);
  const lastUrlRef = useRef<string>("");
  const [duplicateIndex, setDuplicateIndex] = useState<number | null>(null);

  const canEditSingleMeta = singleTrackUrl.trim().length > 0;
  const isDuplicate = duplicateIndex !== null;

  const handleImportPlaylist = useCallback(() => {
    if (playlistLoading) return;
    setPlaylistAddError(null);
    setPendingPlaylistImport(true);
    void handleFetchPlaylist();
  }, [handleFetchPlaylist, playlistLoading]);

  useEffect(() => {
    if (!pendingPlaylistImport) return;
    if (playlistLoading) return;

    if (playlistError) {
      setPendingPlaylistImport(false);
      return;
    }

    if (fetchedPlaylistItems.length === 0) return;

    const incoming = buildEditableItems(fetchedPlaylistItems);
    const { duplicates } = appendItems(incoming);

    if (duplicates > 0) {
      setPlaylistAddError(DUPLICATE_SONG_ERROR);
    }

    setPendingPlaylistImport(false);
    handleResetPlaylist();
  }, [
    appendItems,
    fetchedPlaylistItems,
    handleResetPlaylist,
    pendingPlaylistImport,
    playlistError,
    playlistLoading,
  ]);

  const fetchOEmbedMeta = useCallback(async (url: string) => {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url,
    )}&format=json`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error("無法解析影片資訊，請確認連結是否正確或可公開瀏覽");
    }

    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };

    return data;
  }, []);

  const handleSingleTrackResolve = useCallback(async () => {
    const url = singleTrackUrl.trim();

    if (!url) {
      setSingleTrackError("請先貼上 YouTube 影片連結");
      return;
    }

    if (singleTrackLoading) return;
    if (lastResolvedUrlRef.current === url) return;

    setSingleTrackLoading(true);
    setSingleTrackError(null);

    try {
      const meta = await fetchOEmbedMeta(url);

      if (meta.title) {
        setSingleTrackTitle(meta.title);
      }

      if (meta.author_name) {
        setSingleTrackUploader(meta.author_name);
      }

      const resolvedChannelId =
        (authToken
          ? await collectionsApi.resolveYoutubeChannelId(authToken, {
              videoUrl: url,
              channelUrl: meta.author_url,
            })
          : null) ?? extractYoutubeChannelId(meta.author_url);

      if (resolvedChannelId) {
        setSingleTrackChannelId(resolvedChannelId);
      }

      if (!singleTrackAnswer && meta.title) {
        setSingleTrackAnswer(meta.title);
      }
    } catch (error) {
      setSingleTrackError(
        error instanceof Error ? error.message : "解析失敗，請稍後再試",
      );
    } finally {
      lastResolvedUrlRef.current = url;
      setSingleTrackLoading(false);
    }
  }, [
    authToken,
    fetchOEmbedMeta,
    singleTrackAnswer,
    singleTrackLoading,
    singleTrackUrl,
  ]);

  useEffect(() => {
    const url = singleTrackUrl.trim();
    if (!url) return;
    if (!/youtu\.be|youtube\.com/.test(url)) return;

    void handleSingleTrackResolve();
  }, [handleSingleTrackResolve, singleTrackUrl]);

  useEffect(() => {
    const url = singleTrackUrl.trim();
    if (url === lastUrlRef.current) return;

    lastUrlRef.current = url;

    if (!url) {
      setDuplicateIndex(null);
      setSingleTrackError(null);
      return;
    }

    setSingleTrackTitle("");
    setSingleTrackAnswer("");
    setSingleTrackUploader("");
    setSingleTrackChannelId("");
    setSingleTrackError(null);

    const key = getPlaylistItemKey({ url });
    if (!key) {
      setDuplicateIndex(null);
      return;
    }

    const matchIndex = playlistItems.findIndex(
      (item) => getPlaylistItemKey(item) === key,
    );

    setDuplicateIndex(matchIndex >= 0 ? matchIndex : null);
  }, [playlistItems, singleTrackUrl]);

  const handleAddSingleTrack = useCallback(() => {
    setSingleTrackError(null);

    const url = singleTrackUrl.trim();
    const title = singleTrackTitle.trim();

    if (!url && !title) {
      setSingleTrackError("請輸入 YouTube 連結或歌曲名稱");
      return;
    }

    const candidateKey = getPlaylistItemKey({ url, title });
    if (candidateKey) {
      const existingKeys = new Set(
        playlistItems.map((item) => getPlaylistItemKey(item)).filter(Boolean),
      );

      if (existingKeys.has(candidateKey)) {
        setSingleTrackError(DUPLICATE_SONG_ERROR);
        return;
      }
    }

    const durationSec =
      parseDurationToSeconds(singleTrackDuration) ?? DEFAULT_DURATION_SEC;
    const safeDuration = Math.max(1, durationSec);
    const videoId = extractVideoId(url);
    const thumbnail = videoId ? thumbnailFromId(videoId) : undefined;
    const resolvedTitle = title || url;
    const localId = createLocalId();
    const provider = videoId ? "youtube" : "manual";
    const sourceId = videoId ?? localId;

    const newItem: EditableItem = {
      localId,
      sourceProvider: provider,
      sourceId,
      title: resolvedTitle,
      url: url || "",
      thumbnail,
      uploader: singleTrackUploader.trim(),
      channelId: singleTrackChannelId.trim() || undefined,
      duration: formatSeconds(safeDuration),
      startSec: 0,
      endSec: Math.max(1, Math.min(DEFAULT_DURATION_SEC, safeDuration)),
      answerText: singleTrackAnswer.trim() || resolvedTitle,
    };

    appendItems([newItem], { selectLast: true, scrollToLast: true });

    setSingleTrackUrl("");
    setSingleTrackTitle("");
    setSingleTrackDuration("");
    setSingleTrackAnswer("");
    setSingleTrackUploader("");
    setSingleTrackChannelId("");
    setDuplicateIndex(null);
    setSourceModalOpen(false);
  }, [
    appendItems,
    playlistItems,
    singleTrackAnswer,
    singleTrackChannelId,
    singleTrackDuration,
    singleTrackTitle,
    singleTrackUploader,
    singleTrackUrl,
  ]);

  const handleSingleTrackUrlChange = useCallback((value: string) => {
    setSingleTrackUrl(value);
  }, []);

  const handleSingleTrackTitleChange = useCallback((value: string) => {
    setSingleTrackTitle(value);
  }, []);

  const handleSingleTrackAnswerChange = useCallback((value: string) => {
    setSingleTrackAnswer(value);
  }, []);

  const handleSingleTrackCancel = useCallback(() => {
    setSingleTrackError(null);
  }, []);

  const openPlaylistImportModal = useCallback(() => {
    setSourceModalMode("playlist");
    setSourceModalOpen(true);
  }, []);

  return {
    sourceModalOpen,
    setSourceModalOpen,
    sourceModalMode,
    setSourceModalMode,
    openPlaylistImportModal,

    playlistAddError,
    setPlaylistAddError,

    singleTrackUrl,
    singleTrackTitle,
    singleTrackDuration,
    singleTrackAnswer,
    singleTrackUploader,
    singleTrackChannelId,
    singleTrackError,
    singleTrackLoading,

    duplicateIndex,
    isDuplicate,
    canEditSingleMeta,

    handleImportPlaylist,
    handleSingleTrackUrlChange,
    handleSingleTrackTitleChange,
    handleSingleTrackAnswerChange,
    handleSingleTrackCancel,
    handleAddSingleTrack,
  };
}

