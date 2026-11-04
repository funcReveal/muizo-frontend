import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ComposerCount from "./ComposerCount";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ContentPasteRounded from "@mui/icons-material/ContentPasteRounded";
import { extractYoutubePlaylistUrl } from "../../shared/model/youtubePlaylistLink";
import { useTranslation } from "react-i18next";
import CloseRounded from "@mui/icons-material/CloseRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import YouTube from "@mui/icons-material/YouTube";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import QueueMusicRounded from "@mui/icons-material/QueueMusicRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import { CircularProgress } from "@mui/material";
import { List as VirtualList, type RowComponentProps } from "react-window";
import SiteTooltip from "@shared/ui/SiteTooltip";
import CreateHelp from "./CreateHelp";
import { importFailureReason } from "../utils/importFailureReason";

import { MuizoSelect, type MuizoSelectOption } from "@shared/ui/select";
import type { CollectionCreateImportSource } from "../hooks/useCollectionCreateImportSources";

type YoutubePlaylistOption = {
  id: string;
  title: string;
  itemCount: number;
  thumbnail?: string;
};

function TrackTooltipRow({ title, detail, thumbnail, videoId, url }: { title: string; detail?: string | null; thumbnail?: string; videoId?: string | null; url?: string }) {
  const image = thumbnail || (videoId && /^[\w-]{11}$/.test(videoId) ? `https://i.ytimg.com/vi/${videoId}/default.jpg` : null);
  let link: string | undefined;
  try {
    const parsed = new URL(url || (videoId && /^[\w-]{11}$/.test(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : ""));
    if (parsed.protocol === "https:" && ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(parsed.hostname)) link = parsed.href;
  } catch { /* Some unavailable videos have no link. */ }
  const content = <>
    {image ? <img src={image} alt="" loading="lazy" /> : <span className="create-track-tooltip-placeholder"><QueueMusicRounded aria-hidden="true" /></span>}
    <span className="create-track-tooltip-copy"><b title={title}>{title}</b>{detail && <small title={detail}>{detail}</small>}</span>
  </>;
  return link ? <a className="create-track-tooltip-row" href={link} target="_blank" rel="noopener noreferrer" aria-label={`在 YouTube 開啟 ${title}`}>{content}</a> : <span className="create-track-tooltip-row">{content}</span>;
}

type TrackDetails = { title: string; detail?: string | null; thumbnail?: string; videoId?: string | null; url?: string };
function VirtualTrackRow({ index, style, items }: RowComponentProps<{ items: TrackDetails[] }>) {
  return <div style={style}><TrackTooltipRow {...items[index]} /></div>;
}
function TrackTooltipList({ title, items, missing = 0 }: { title: string; items: TrackDetails[]; missing?: number }) {
  return <div className="create-track-tooltip"><strong>{title}</strong>
    {items.length > 0 && <VirtualList className="create-track-tooltip-list" style={{ height: Math.min(items.length * 48, 240), width: "100%" }} rowCount={items.length} rowHeight={48} rowComponent={VirtualTrackRow} rowProps={{ items }} overscanCount={2} />}
    {missing > 0 && <span className="create-track-tooltip-missing">另有 {missing} 首沒有可用的曲目資料</span>}
  </div>;
}

type Props = {
  actions?: ReactNode;
  authUserExists: boolean;
  hasGoogleYouTubeConnection: boolean;
  needsGoogleReauth: boolean;
  onLinkGoogleYouTube: () => void;

  playlistSource: "url" | "youtube" | "favorites";
  onPlaylistSourceChange: (value: "url" | "youtube" | "favorites") => void;
  sourceSwitchDisabled: boolean;

  playlistUrl: string;
  trimmedPlaylistUrl: string;
  showPlaylistUrlError: boolean;
  playlistUrlTooltipMessage: string;
  isPlaylistUrlFocused: boolean;
  onPlaylistUrlFocusChange: (value: boolean) => void;
  onPlaylistUrlChange: (value: string) => void;
  onFetchPlaylist: () => void;
  onClearPlaylistUrl: () => void;
  playlistUrlReadOnly: boolean;
  hasResolvedPlaylist: boolean;
  playlistLoading: boolean;
  playlistError: string | null;
  importProgressPercent?: number | null;
  importProgressLabel?: string | null;

  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  youtubePlaylists: YoutubePlaylistOption[];
  selectedYoutubePlaylistId: string;
  onSelectedYoutubePlaylistIdChange: (value: string) => void;
  youtubeActionError: string | null;
  isImportingYoutubePlaylist: boolean;
  onEnsureYoutubePlaylists: () => void;
  onImportSelectedYoutubePlaylist: (playlistId: string) => Promise<void>;

  // Song favorites tab
  isImportingFavorites: boolean;
  favoritesImportError: string | null;
  hasFavoritesSource: boolean;
  onImportAllFavorites: () => Promise<void>;

  importSources: CollectionCreateImportSource[];
  totalImportedItemCount: number;
  onRemoveImportSource: (sourceId: string) => void;
  onClearImportSources: () => void;
};

export default function CollectionCreateSourcePanel({
  actions,
  authUserExists,
  hasGoogleYouTubeConnection,
  needsGoogleReauth,
  onLinkGoogleYouTube,

  playlistSource,
  onPlaylistSourceChange,
  sourceSwitchDisabled,

  playlistUrl,
  trimmedPlaylistUrl,
  showPlaylistUrlError,
  playlistUrlTooltipMessage,
  isPlaylistUrlFocused,
  onPlaylistUrlFocusChange,
  onPlaylistUrlChange,
  onFetchPlaylist,
  onClearPlaylistUrl,
  playlistUrlReadOnly,
  hasResolvedPlaylist,
  playlistLoading,
  playlistError,
  importProgressPercent = null,

  youtubePlaylistsLoading,
  youtubePlaylistsError,
  youtubePlaylists,
  selectedYoutubePlaylistId,
  onSelectedYoutubePlaylistIdChange,
  youtubeActionError,
  isImportingYoutubePlaylist,
  onEnsureYoutubePlaylists,
  onImportSelectedYoutubePlaylist,

  isImportingFavorites,
  favoritesImportError,
  hasFavoritesSource,
  onImportAllFavorites,

  importSources,
  totalImportedItemCount,
  onRemoveImportSource,
  onClearImportSources,
}: Props) {
  const { t } = useTranslation("collectionCreate");
  const tabId = useId();
  const urlInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const [pasteState, setPasteState] = useState<
    "idle" | "reading" | "filled" | "invalid" | "blocked"
  >("idle");
  const [clipboardStatus, setClipboardStatus] = useState<"unknown" | "valid" | "invalid" | "blocked">("unknown");
  const [dismissedSourceId, setDismissedSourceId] = useState<string | null>(null);
  const [showImportError, setShowImportError] = useState(false);
  useEffect(() => {
    if (!playlistError || playlistSource !== "url") return;
    const showTimer = window.setTimeout(() => setShowImportError(true), 0);
    const hideTimer = window.setTimeout(() => setShowImportError(false), 4000);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, [playlistError, playlistSource]);
  const pasteReadingRef = useRef(false);
  useEffect(() => {
    if (playlistSource !== "url" || playlistUrlReadOnly) return;
    let active = true;
    let permission: PermissionStatus | undefined;
    const check = async () => {
      if (document.visibilityState === "hidden" || !document.hasFocus()) return;
      try {
        // Read in the background only after permission has already been granted.
        if (!permission || permission.state !== "granted") {
          if (active && permission?.state === "denied") setClipboardStatus("blocked");
          return;
        }
        const text = await navigator.clipboard.readText();
        if (active) setClipboardStatus(extractYoutubePlaylistUrl(text) ? "valid" : "invalid");
      } catch {
        if (active) setClipboardStatus("blocked");
      }
    };
    const initialize = async () => {
      try {
        permission = await navigator.permissions.query({name: "clipboard-read" as PermissionName});
        if (!active) return;
        if (permission.state !== "granted") setClipboardStatus("blocked");
        permission.onchange = () => void check();
        await check();
      } catch {
        if (active) setClipboardStatus("blocked");
      }
    };
    void initialize();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 1500);
    return () => {
      active = false;
      if (permission) permission.onchange = null;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [playlistSource, playlistUrlReadOnly]);
  const pasteContextRef = useRef({
    value: playlistUrl,
    locked: playlistUrlReadOnly,
    source: playlistSource,
  });
  const pasteRequestRef = useRef(0);
  useEffect(() => {
    pasteContextRef.current = {
      value: playlistUrl,
      locked: playlistUrlReadOnly,
      source: playlistSource,
    };
  }, [playlistUrl, playlistUrlReadOnly, playlistSource]);
  useEffect(
    () => () => {
      pasteRequestRef.current += 1;
    },
    [],
  );
  const fillClipboardLink = async () => {
    if (pasteReadingRef.current || playlistUrlReadOnly) return;
    pasteReadingRef.current = true;
    const previousValue = playlistUrl;
    const request = ++pasteRequestRef.current;
    setPasteState("reading");
    try {
      const text = await navigator.clipboard.readText();
      // A permission prompt must not overwrite edits made while it was open.
      if (request !== pasteRequestRef.current) return;
      const context = pasteContextRef.current;
      if (
        context.value !== previousValue ||
        context.locked ||
        context.source !== "url"
      ) {
        setPasteState("idle");
        return;
      }
      const link = extractYoutubePlaylistUrl(text);
      if (!link) {
        setPasteState("invalid");
        setClipboardStatus("invalid");
        return;
      }
      setClipboardStatus("valid");
      onPlaylistUrlChange(link);
      setPasteState("filled");
      urlInputRef.current?.focus();
    } catch {
      if (request === pasteRequestRef.current) { setPasteState("blocked"); setClipboardStatus("blocked"); }
    } finally {
      pasteReadingRef.current = false;
    }
  };

  const importedYoutubePlaylistIds = useMemo(
    () =>
      new Set(
        importSources
          .filter((source) => source.type === "youtube_account_playlist")
          .map((source) => source.sourceId),
      ),
    [importSources],
  );

  const youtubePlaylistOptions: MuizoSelectOption[] = youtubePlaylists.map(
    (playlist) => {
      const alreadyImported = importedYoutubePlaylistIds.has(playlist.id);

      return {
        value: playlist.id,
        label: playlist.title,
        thumbnail: playlist.thumbnail,
        description: alreadyImported
          ? t("source.playlistAlreadyImported")
          : t("source.playlistOption", {
              title: "",
              count: playlist.itemCount,
            }).trim(),
        disabled: alreadyImported,
        meta: alreadyImported ? t("source.importedBadge") : undefined,
      };
    },
  );

  const youtubeSelectLoading =
    youtubePlaylistsLoading || isImportingYoutubePlaylist;

  const youtubeSelectPlaceholder = youtubePlaylistsLoading
    ? t("source.playlistSelectLoading")
    : isImportingYoutubePlaylist
      ? t("source.importingYoutube")
      : t("source.playlistSelectPlaceholder");

  const busy =
    playlistLoading || isImportingYoutubePlaylist || isImportingFavorites;
  const tabs = [
    { key: "url", label: "貼上連結", icon: <LinkRounded /> },
    { key: "youtube", label: "YouTube", icon: <YouTube /> },
    { key: "favorites", label: "收藏歌曲", icon: <BookmarkRoundedIcon /> },
  ] as const;
  const activeError =
    playlistSource === "url"
      ? playlistError
      : playlistSource === "youtube"
        ? youtubeActionError || youtubePlaylistsError
        : favoritesImportError;
  const showUrlWarning = showPlaylistUrlError && !isPlaylistUrlFocused;
  const lastImportedSource = importSources[importSources.length - 1];
  const lastImportedSourceId = lastImportedSource?.id;
  useEffect(() => {
    if (!lastImportedSourceId) return;
    const timer = window.setTimeout(() => setDismissedSourceId(lastImportedSourceId), 4000);
    return () => window.clearTimeout(timer);
  }, [lastImportedSourceId]);

  return (
    <section className="create-source-workspace" aria-label="匯入歌曲">
      <div className="create-source-main">
        <div className="create-section-heading">
          <h2>加入歌曲</h2>
          <CreateHelp label="匯入方式說明">
            可混合匯入多份播放清單與收藏歌曲。匯入完成後，再一起調整答案與播放片段。
          </CreateHelp>
        </div>
        <div
          className="create-source-tabs"
          role="tablist"
          aria-label="歌曲來源"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`create-source-${tab.key}`}
              role="tab"
              tabIndex={playlistSource === tab.key ? 0 : -1}
              onKeyDown={(event) => {
                const index = tabs.findIndex((item) => item.key === tab.key);
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % tabs.length
                    : event.key === "ArrowLeft"
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                onPlaylistSourceChange(tabs[next].key);
                document
                  .getElementById(`create-source-${tabs[next].key}`)
                  ?.focus();
              }}
              aria-selected={playlistSource === tab.key}
              aria-controls={`create-panel-${tab.key}`}
              type="button"
              disabled={sourceSwitchDisabled}
              onClick={() => onPlaylistSourceChange(tab.key)}
            >
              {playlistSource === tab.key && (
                <motion.span
                  className="create-source-tab-selection"
                  layoutId={`${tabId}-source`}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 460,
                          damping: 38,
                          mass: 0.7,
                        }
                  }
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <motion.div
          key={playlistSource}
          initial={reduceMotion ? false : { opacity: 0.45, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.22,
            ease: [0.16, 1, 0.3, 1],
          }}
          id={`create-panel-${playlistSource}`}
          role="tabpanel"
          aria-labelledby={`create-source-${playlistSource}`}
          className="create-source-input"
          aria-busy={busy}
        >
          {playlistSource === "url" && (
            <>
              <div className="create-input-heading">
                <label htmlFor="create-playlist-url">播放清單連結</label>
                <CreateHelp label="支援的連結">
                  <ul style={{ margin: 0, paddingLeft: "1.25em", listStyleType: "disc" }}>
                    <li>播放清單網址需包含 list=。</li>
                    <li>不支援私人播放清單。</li>
                  </ul>
                </CreateHelp>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    trimmedPlaylistUrl &&
                    !busy &&
                    !playlistUrlReadOnly &&
                    !showPlaylistUrlError
                  )
                    onFetchPlaylist();
                }}
              >
                <div
                  className="create-url-field"
                  data-invalid={showUrlWarning || Boolean(playlistError)}
                  data-busy={playlistLoading}
                >
                  <LinkRounded aria-hidden="true" />
                  <SiteTooltip title={showUrlWarning ? playlistUrlTooltipMessage : playlistError || undefined} open={showUrlWarning || (Boolean(playlistError) && showImportError) ? true : undefined}>
                  <input
                    ref={urlInputRef}
                    id="create-playlist-url"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="https://youtube.com/playlist?list=…"
                    value={playlistUrl}
                    readOnly={playlistUrlReadOnly}
                    aria-invalid={showUrlWarning || Boolean(playlistError)}
                    aria-describedby={
                      showUrlWarning
                        ? "create-url-error"
                        : activeError
                          ? "create-import-error"
                          : undefined
                    }
                    onFocus={() => onPlaylistUrlFocusChange(true)}
                    onBlur={() => onPlaylistUrlFocusChange(false)}
                    onChange={(event) => {
                      setPasteState("idle");
                      onPlaylistUrlChange(event.target.value);
                    }}
                    onPaste={(event) => {
                      if (playlistUrlReadOnly || busy) return;
                      const link = extractYoutubePlaylistUrl(
                        event.clipboardData.getData("text"),
                      );
                      if (!link) return;
                      event.preventDefault();
                      setPasteState("filled");
                      onPlaylistUrlChange(link);
                    }}
                  />
                  </SiteTooltip>
                  {!playlistUrlReadOnly && (
                    <SiteTooltip title={clipboardStatus === "valid" ? "從剪貼簿貼上播放清單連結" : clipboardStatus === "invalid" ? "剪貼簿中沒有 YouTube 播放清單連結" : "無法讀取剪貼簿，請使用 Ctrl / Cmd + V 或長按輸入框貼上"}>
                      <span className="create-paste-wrap" tabIndex={clipboardStatus !== "valid" ? 0 : undefined}>
                        <button
                          type="button"
                          className="create-paste-button"
                          aria-label="貼上播放清單連結"
                          onClick={() => void fillClipboardLink()}
                          disabled={busy || pasteState === "reading" || clipboardStatus !== "valid"}
                        >
                          {pasteState === "reading" ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <ContentPasteRounded fontSize="small" />
                          )}
                          {!trimmedPlaylistUrl && <span>貼上</span>}
                        </button>
                      </span>
                    </SiteTooltip>
                  )}
                  {trimmedPlaylistUrl && (
                    <button
                      className="create-icon-button"
                      type="button"
                      onClick={() => {
                        setPasteState("idle");
                        onClearPlaylistUrl();
                      }}
                      aria-label={
                        hasResolvedPlaylist
                          ? t("source.reselectPlaylist")
                          : t("source.clearPlaylistUrl")
                      }
                      disabled={busy}
                    >
                      <CloseRounded fontSize="small" />
                    </button>
                  )}
                </div>
                <div className="create-url-assist" aria-live="polite">
                  {pasteState === "blocked" ? <span>無法讀取剪貼簿，請在輸入框使用 Ctrl / Cmd + V，或長按貼上。</span>
                    : pasteState === "invalid" ? <span>剪貼簿中沒有播放清單連結，請複製 YouTube 分享連結。</span>
                    : <span />}
                  {clipboardStatus === "blocked" && !playlistUrlReadOnly && !trimmedPlaylistUrl && (
                    <button type="button" className="create-clipboard-permission" onClick={() => void fillClipboardLink()} disabled={busy || pasteState === "reading"}>允許並貼上</button>
                  )}
                </div>
                {showUrlWarning && <span id="create-url-error" className="sr-only" role="alert">{playlistUrlTooltipMessage}</span>}
                {activeError && <span id="create-import-error" className="sr-only" role="alert">{activeError}</span>}
                <div className="create-import-action-row">
                <div className="create-import-result">
                  <AnimatePresence initial={false}>
                  {!busy && pasteState === "filled" && trimmedPlaylistUrl && !showPlaylistUrlError && (
                    <motion.div key="link-ready" className="create-import-complete" role="status"
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}>
                      <CheckCircleRounded aria-hidden="true" />
                      <span><strong>連結已準備好</strong><small>按下匯入歌曲繼續</small></span>
                    </motion.div>
                  )}
                  {!busy && !trimmedPlaylistUrl && lastImportedSource && lastImportedSource.id !== dismissedSourceId && (
                    <motion.div key={lastImportedSource.id} className="create-import-complete" role="status"
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}>
                      <CheckCircleRounded aria-hidden="true" />
                      <span><strong>已加入歌單</strong><small title={lastImportedSource.title}>{lastImportedSource.title}</small></span>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
                <span>
                <button
                  type="submit"
                  className="create-primary create-import-button"
                  disabled={
                    !trimmedPlaylistUrl ||
                    busy ||
                    playlistUrlReadOnly ||
                    showPlaylistUrlError
                  }
                >
                  {playlistLoading ? (
                    <CircularProgress size={17} color="inherit" />
                  ) : (
                    <DownloadRounded fontSize="small" />
                  )}
                  {playlistLoading ? `正在匯入${importProgressPercent === null ? "" : ` ${Math.round(importProgressPercent)}%`}` : playlistError ? "重新匯入" : "匯入歌曲"}
                </button>
                </span>
                </div>
              </form>
            </>
          )}
          {playlistSource === "youtube" && (
            <>
              {!authUserExists ||
              !hasGoogleYouTubeConnection ||
              needsGoogleReauth ? (
                <div className="create-connect-state">
                  <YouTube className="create-source-symbol" />
                  <h3>
                    {needsGoogleReauth
                      ? "重新連結 YouTube"
                      : "選取你的播放清單"}
                  </h3>
                  <CreateHelp label="為什麼需要連結帳號">
                    授權後只會讀取你選擇的播放清單，不會修改 YouTube 上的內容。
                  </CreateHelp>
                  <button
                    type="button"
                    className="create-primary"
                    onClick={onLinkGoogleYouTube}
                  >
                    連結 YouTube <ArrowForwardRounded fontSize="small" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="create-input-heading">
                    <span>選擇播放清單</span>
                    <CreateHelp label="播放清單匯入說明">
                      選擇後直接匯入。已加入的播放清單會標記為已匯入。
                    </CreateHelp>
                  </div>
                  <SiteTooltip title={activeError || undefined} open={activeError ? true : undefined}><div>
                  <MuizoSelect
                    value={selectedYoutubePlaylistId}
                    options={youtubePlaylistOptions}
                    placeholder={youtubeSelectPlaceholder}
                    loading={youtubeSelectLoading}
                    disabled={youtubeSelectLoading}
                    emptyText={t("source.playlistSelectPlaceholder")}
                    onOpen={onEnsureYoutubePlaylists}
                    onChange={(id) => {
                      onSelectedYoutubePlaylistIdChange(id);
                      if (id) void onImportSelectedYoutubePlaylist(id);
                    }}
                  />
                  </div></SiteTooltip>
                  {activeError && <span className="sr-only" role="alert">{activeError}</span>}
                </>
              )}
            </>
          )}
          {playlistSource === "favorites" && (
            <div className="create-connect-state">
              <BookmarkRoundedIcon className="create-source-symbol" />
              <h3>
                {hasFavoritesSource ? "收藏歌曲已加入" : "匯入你的收藏歌曲"}
              </h3>
              <CreateHelp label="收藏歌曲匯入說明">
                匯入遊戲中收藏的所有歌曲。在下一步可移除曲目或修改答案，不會影響原本的收藏。
              </CreateHelp>
              <SiteTooltip title={favoritesImportError || undefined} open={favoritesImportError ? true : undefined}><span>
              <button
                type="button"
                className="create-primary"
                disabled={isImportingFavorites}
                onClick={() => void onImportAllFavorites()}
              >
                {isImportingFavorites ? (
                  <CircularProgress size={17} color="inherit" />
                ) : (
                  <DownloadRounded fontSize="small" />
                )}
                {isImportingFavorites
                  ? "正在匯入"
                  : hasFavoritesSource
                    ? "重新匯入"
                    : "匯入收藏歌曲"}
              </button>
              </span></SiteTooltip>
              {favoritesImportError && <span className="sr-only" role="alert">{favoritesImportError}</span>}
            </div>
          )}
        </motion.div>
        {busy && <span className="sr-only" role="status">正在匯入歌曲</span>}
      </div>
      <aside
        className="create-import-tray"
        aria-label="已匯入歌曲"
        aria-live="polite"
      >
        <div className="create-section-heading">
          <h2>本次歌單</h2>
          <span
            className="create-count"
            data-ready={totalImportedItemCount > 0}
          >
            <ComposerCount value={totalImportedItemCount} />
            <small> 首</small>
          </span>
        </div>
        {importSources.length === 0 ? (
          <div className="create-tray-empty">
            <div className="create-empty-art" aria-hidden="true">
              <span className="create-empty-disc">
                <QueueMusicRounded />
              </span>
              <span className="create-empty-note">♪</span>
            </div>
            <strong>先加入一份歌單</strong>
            <span>歌曲會整理在這裡</span>
            <div className="create-empty-slots">
              <i>
                <b />
                <span />
                <em />
              </i>
              <i>
                <b />
                <span />
                <em />
              </i>
              <i>
                <b />
                <span />
                <em />
              </i>
            </div>
          </div>
        ) : (
          <>
            <ul className="create-import-list">
              <AnimatePresence>
                {importSources.map((source) => {
                  const thumbnail = source.items.find(
                    (item) => item.thumbnail,
                  )?.thumbnail;
                  return (
                    <motion.li
                      key={source.id}
                      layout={reduceMotion ? false : "position"}
                      initial={
                        reduceMotion ? false : { opacity: 0, x: 24 }
                      }
                      animate={{ opacity: 1, x: 0 }}
                      exit={
                        reduceMotion
                          ? { opacity: 1 }
                          : { opacity: 0, x: 12 }
                      }
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 380,
                              damping: 32,
                            }
                      }
                    >
                      {thumbnail ? (
                        <img src={thumbnail} alt="" />
                      ) : (
                        <span className="create-import-icon">
                          <QueueMusicRounded />
                        </span>
                      )}
                      <div>
                        <strong>{source.title}</strong>
                        <span className="create-import-counts">
                          <SiteTooltip interactiveContent leaveDelay={400} title={<TrackTooltipList title="已匯入曲目" items={source.items.map((item) => ({title: item.title || item.answerText || "未命名曲目", detail: [item.uploader, item.duration].filter(Boolean).join(" · "), thumbnail: item.thumbnail, videoId: item.videoId, url: item.url}))} />}>
                            <button type="button" className="create-import-count-button" aria-label={`查看 ${source.itemCount} 首已匯入曲目`}>{source.itemCount} 首</button>
                          </SiteTooltip>
                          {source.skippedCount > 0 && <>
                            <span aria-hidden="true"> · </span>
                            <SiteTooltip interactiveContent leaveDelay={400} title={<TrackTooltipList title="匯入失敗曲目" items={source.skippedItems.map((item) => ({title: item.title || "無法取得曲目名稱", detail: importFailureReason(item), videoId: item.videoId}))} missing={Math.max(0, source.skippedCount - source.skippedItems.length)} />}>
                              <button type="button" className="create-import-count-button" aria-label={`查看 ${source.skippedCount} 首匯入失敗曲目`}>{source.skippedCount} 首匯入失敗</button>
                            </SiteTooltip>
                          </>}
                        </span>
                      </div>
                      <SiteTooltip title="移除此來源">
                        <button
                          type="button"
                          className="create-icon-button"
                          onClick={() => onRemoveImportSource(source.id)}
                          aria-label={`移除 ${source.title}`}
                          disabled={busy}
                        >
                          <CloseRounded fontSize="small" />
                        </button>
                      </SiteTooltip>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
            {!actions && (
              <div className="create-import-ready">
                <CheckCircleRounded fontSize="small" />
                <span>歌單已就緒，繼續整理題目</span>
              </div>
            )}
            {importSources.length > 1 && (
              <button
                type="button"
                className="create-text-button"
                disabled={busy}
                onClick={onClearImportSources}
              >
                清空來源
              </button>
            )}
          </>
        )}
        {actions}
      </aside>
    </section>
  );
}
