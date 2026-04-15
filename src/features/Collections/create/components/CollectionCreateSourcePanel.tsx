import CloseRounded from "@mui/icons-material/CloseRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Tooltip,
} from "@mui/material";

const PUBLIC_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm6.93 9h-3.1a15.9 15.9 0 0 0-1.38-5.02A8.02 8.02 0 0 1 18.93 11ZM12 4.04c.83 1.2 1.86 3.63 2.16 6.96H9.84C10.14 7.67 11.17 5.24 12 4.04ZM4.07 13h3.1a15.9 15.9 0 0 0 1.38 5.02A8.02 8.02 0 0 1 4.07 13Zm3.1-2h-3.1a8.02 8.02 0 0 1 4.48-5.02A15.9 15.9 0 0 0 7.17 11Zm4.83 8.96c-.83-1.2-1.86-3.63-2.16-6.96h4.32c-.3 3.33-1.33 5.76-2.16 6.96ZM14.45 18.02A15.9 15.9 0 0 0 15.83 13h3.1a8.02 8.02 0 0 1-4.48 5.02Z"/></svg>',
);

const PRIVATE_SWITCH_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f172a"><path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 8.73V17a1 1 0 1 0 2 0v-.27a2 2 0 1 0-2 0ZM10 8V6a2 2 0 0 1 4 0v2Z"/></svg>',
);

type YoutubePlaylistOption = {
  id: string;
  title: string;
  itemCount: number;
};

type Props = {
  authUserExists: boolean;
  needsGoogleReauth: boolean;
  onLoginWithGoogle: () => void;

  playlistSource: "url" | "youtube";
  onPlaylistSourceChange: (value: "url" | "youtube") => void;

  playlistUrl: string;
  trimmedPlaylistUrl: string;
  showPlaylistUrlError: boolean;
  playlistUrlTooltipMessage: string;
  isPlaylistUrlFocused: boolean;
  onPlaylistUrlFocusChange: (value: boolean) => void;
  onPlaylistUrlChange: (value: string) => void;
  onFetchPlaylist: () => void;
  onClearPlaylistUrl: () => void;
  playlistLoading: boolean;
  playlistError: string | null;

  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  youtubePlaylists: YoutubePlaylistOption[];
  selectedYoutubePlaylistId: string;
  onSelectedYoutubePlaylistIdChange: (value: string) => void;
  youtubeActionError: string | null;
  isImportingYoutubePlaylist: boolean;
  onEnsureYoutubePlaylists: () => void;
  onImportSelectedYoutubePlaylist: (playlistId: string) => Promise<void>;

  visibility: "private" | "public";
  onVisibilityChange: (value: "private" | "public") => void;

  isAdmin: boolean;
  collectionsCount: number;
  privateCollectionsCount: number;
  remainingCollectionSlots: number;
  remainingPrivateCollectionSlots: number;
  maxCollectionsPerUser: number;
  maxPrivateCollectionsPerUser: number;
  reachedCollectionLimit: boolean;
  reachedPrivateCollectionLimit: boolean;

  createError: string | null;
};

export default function CollectionCreateSourcePanel({
  authUserExists,
  needsGoogleReauth,
  onLoginWithGoogle,

  playlistSource,
  onPlaylistSourceChange,

  playlistUrl,
  trimmedPlaylistUrl,
  showPlaylistUrlError,
  playlistUrlTooltipMessage,
  isPlaylistUrlFocused,
  onPlaylistUrlFocusChange,
  onPlaylistUrlChange,
  onFetchPlaylist,
  onClearPlaylistUrl,
  playlistLoading,
  playlistError,

  youtubePlaylistsLoading,
  youtubePlaylistsError,
  youtubePlaylists,
  selectedYoutubePlaylistId,
  onSelectedYoutubePlaylistIdChange,
  youtubeActionError,
  isImportingYoutubePlaylist,
  onEnsureYoutubePlaylists,
  onImportSelectedYoutubePlaylist,

  visibility,
  onVisibilityChange,

  isAdmin,
  collectionsCount,
  privateCollectionsCount,
  remainingCollectionSlots,
  remainingPrivateCollectionSlots,
  maxCollectionsPerUser,
  maxPrivateCollectionsPerUser,
  reachedCollectionLimit,
  reachedPrivateCollectionLimit,

  createError,
}: Props) {
  return (
    <div className="grid gap-3 lg:grid-rows-[auto_auto_1fr]">
      <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1 text-[11px]">
            <button
              type="button"
              onClick={() => onPlaylistSourceChange("url")}
              className={`rounded-full px-3 py-1 transition ${
                playlistSource === "url"
                  ? "bg-[var(--mc-accent)]/15 text-[var(--mc-text)]"
                  : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
              }`}
            >
              連結
            </button>
            <button
              type="button"
              onClick={() => onPlaylistSourceChange("youtube")}
              className={`rounded-full px-3 py-1 transition ${
                playlistSource === "youtube"
                  ? "bg-[var(--mc-accent-2)]/15 text-[var(--mc-text)]"
                  : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
              }`}
            >
              YouTube 清單
            </button>
          </div>
        </div>

        <div className="relative mt-3 min-h-[120px]">
          <div
            className={`space-y-3 transition-all duration-200 ${
              playlistSource === "url"
                ? "opacity-100 translate-x-0"
                : "pointer-events-none opacity-0 -translate-x-2"
            }`}
            hidden={playlistSource !== "url"}
          >
            <div className="rounded-[24px] border border-[var(--mc-border)] bg-[linear-gradient(180deg,rgba(2,6,23,0.34),rgba(15,23,42,0.22))] p-4 sm:p-5">
              <div>
                <Tooltip
                  title={playlistUrlTooltipMessage}
                  placement="top"
                  arrow
                  open={Boolean(isPlaylistUrlFocused && trimmedPlaylistUrl)}
                  disableFocusListener
                  disableHoverListener
                  disableTouchListener
                >
                  <TextField
                    fullWidth
                    size="small"
                    label="YouTube 播放清單網址"
                    placeholder="https://www.youtube.com/playlist?list=..."
                    value={playlistUrl}
                    autoComplete="off"
                    error={showPlaylistUrlError}
                    onFocus={() => onPlaylistUrlFocusChange(true)}
                    onBlur={() => onPlaylistUrlFocusChange(false)}
                    onChange={(e) => onPlaylistUrlChange(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || playlistLoading) {
                        return;
                      }
                      event.preventDefault();
                      onFetchPlaylist();
                    }}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: {
                        endAdornment: trimmedPlaylistUrl ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={onClearPlaylistUrl}
                              edge="end"
                              aria-label="清除播放清單網址"
                              sx={{ color: "rgba(148,163,184,0.92)" }}
                            >
                              <CloseRounded fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : undefined,
                      },
                      htmlInput: {
                        lang: "en",
                        autoComplete: "off",
                        autoCorrect: "off",
                        autoCapitalize: "off",
                        inputMode: "url",
                        spellCheck: "false",
                        style: { imeMode: "disabled" },
                      },
                    }}
                    sx={{
                      "& .MuiInputLabel-root": {
                        color: "rgba(248, 250, 252, 0.72)",
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: showPlaylistUrlError
                          ? "rgba(251, 113, 133, 0.96)"
                          : "rgba(251, 191, 36, 0.96)",
                      },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                        backgroundColor: "rgba(2, 6, 23, 0.32)",
                        boxShadow:
                          "0 0 0 1px rgba(148, 163, 184, 0.12), 0 10px 28px rgba(2, 6, 23, 0.18)",
                        transition:
                          "background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                        "& fieldset": {
                          borderColor: showPlaylistUrlError
                            ? "rgba(248, 113, 113, 0.5)"
                            : "rgba(148, 163, 184, 0.2)",
                        },
                        "&:hover": {
                          backgroundColor: "rgba(15, 23, 42, 0.52)",
                          boxShadow: showPlaylistUrlError
                            ? "0 0 0 1px rgba(248, 113, 113, 0.26), 0 18px 38px rgba(127, 29, 29, 0.18)"
                            : "0 0 0 1px rgba(34, 211, 238, 0.16), 0 16px 34px rgba(8, 47, 73, 0.2)",
                        },
                        "&:hover fieldset": {
                          borderColor: showPlaylistUrlError
                            ? "rgba(248, 113, 113, 0.66)"
                            : "rgba(34, 211, 238, 0.34)",
                        },
                        "&.Mui-focused": {
                          backgroundColor: "rgba(15, 23, 42, 0.62)",
                          boxShadow: showPlaylistUrlError
                            ? "0 0 0 1px rgba(248, 113, 113, 0.28), 0 18px 38px rgba(127, 29, 29, 0.18)"
                            : "0 0 0 1px rgba(251, 191, 36, 0.28), 0 18px 38px rgba(120, 53, 15, 0.18)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: showPlaylistUrlError
                            ? "rgba(248, 113, 113, 0.72)"
                            : "rgba(251, 191, 36, 0.72)",
                        },
                      },
                    }}
                  />
                </Tooltip>
              </div>

              {playlistLoading ? (
                <div className="mt-4 flex justify-end">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-100/90">
                    <CircularProgress
                      size={14}
                      thickness={5}
                      sx={{ color: "#38bdf8" }}
                    />
                    載入中...
                  </div>
                </div>
              ) : null}

              {playlistError && (
                <div className="mt-3 rounded-2xl border border-rose-500/35 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
                  {playlistError}
                </div>
              )}
            </div>
          </div>

          <div
            className={`space-y-3 transition-all duration-200 ${
              playlistSource === "youtube"
                ? "opacity-100 translate-x-0"
                : "pointer-events-none opacity-0 translate-x-2"
            }`}
            hidden={playlistSource !== "youtube"}
          >
            <div className="text-[11px] text-[var(--mc-text-muted)]">
              {(!authUserExists || needsGoogleReauth) && (
                <>
                  登入 Google 後可直接載入你的 YouTube 播放清單
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onLoginWithGoogle}
                  >
                    登入 Google
                  </Button>
                </>
              )}
              {youtubePlaylistsError && (
                <span className="text-[11px] text-rose-300">
                  {youtubePlaylistsError}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <select
                value={selectedYoutubePlaylistId}
                onFocus={onEnsureYoutubePlaylists}
                onChange={async (e) => {
                  const nextId = e.target.value;
                  onSelectedYoutubePlaylistIdChange(nextId);
                  if (!nextId) return;
                  await onImportSelectedYoutubePlaylist(nextId);
                }}
                disabled={youtubePlaylistsLoading || isImportingYoutubePlaylist}
                className="w-full rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/75 px-3 py-2 text-sm text-[var(--mc-text)] disabled:cursor-not-allowed disabled:opacity-65"
              >
                <option value="">
                  {youtubePlaylistsLoading
                    ? "載入播放清單中..."
                    : "請選擇 YouTube 播放清單"}
                </option>
                {youtubePlaylists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {`${playlist.title}（${playlist.itemCount} 首）`}
                  </option>
                ))}
              </select>

              {youtubePlaylistsLoading && (
                <div className="animate-pulse rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 px-3 py-2 text-xs text-[var(--mc-text-muted)]">
                  正在載入你的播放清單...
                </div>
              )}

              {youtubeActionError && (
                <div className="rounded-lg border border-rose-500/35 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
                  {youtubeActionError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/55 text-[var(--mc-accent)]">
              {visibility === "public" ? (
                <PublicOutlined sx={{ fontSize: 18 }} />
              ) : (
                <LockOutlined sx={{ fontSize: 18 }} />
              )}
            </div>
            <div className="text-sm font-semibold text-[var(--mc-text)]">
              {visibility === "public" ? "公開收藏" : "私人收藏"}
            </div>
          </div>

          <Tooltip title={visibility === "public" ? "公開中" : "私人"}>
            <Switch
              size="small"
              checked={visibility === "public"}
              onChange={(_, checked) =>
                onVisibilityChange(checked ? "public" : "private")
              }
              inputProps={{
                "aria-label": "切換收藏庫可見性",
              }}
              sx={{
                width: 52,
                height: 32,
                padding: 0,
                "& .MuiSwitch-switchBase": {
                  padding: "4px",
                  transitionDuration: "200ms",
                },
                "& .MuiSwitch-switchBase.Mui-checked": {
                  transform: "translateX(20px)",
                  color: "#fff",
                },
                "& .MuiSwitch-thumb": {
                  position: "relative",
                  width: 24,
                  height: 24,
                  boxShadow: "none",
                  backgroundColor: "var(--mc-text)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "16px 16px",
                    backgroundImage: `url("data:image/svg+xml,${visibility === "public" ? PUBLIC_SWITCH_ICON : PRIVATE_SWITCH_ICON}")`,
                  },
                },
                "& .MuiSwitch-track": {
                  borderRadius: 999,
                  backgroundColor: "rgba(148, 163, 184, 0.28)",
                  opacity: 1,
                },
                "& .Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "var(--mc-accent)",
                  opacity: 0.65,
                },
              }}
            />
          </Tooltip>
        </div>

        <div className="mt-2 text-[12px] text-[var(--mc-text-muted)]">
          私人收藏僅自己可見，公開收藏可讓其他玩家瀏覽與使用
        </div>

        {!isAdmin && (
          <>
            <div className="mt-2 text-[12px] text-[var(--mc-text-muted)]">
              目前已建立 {collectionsCount} / {maxCollectionsPerUser}{" "}
              個收藏庫，還能再建立 {remainingCollectionSlots} 個。
            </div>
            <div className="mt-1 text-[12px] text-[var(--mc-text-muted)]">
              私人收藏目前 {privateCollectionsCount} /{" "}
              {maxPrivateCollectionsPerUser} 個，還能再建立{" "}
              {remainingPrivateCollectionSlots} 個。
            </div>

            {reachedCollectionLimit && (
              <div className="mt-2 rounded-lg border border-amber-400/35 bg-amber-950/35 px-2.5 py-2 text-[12px] text-amber-200">
                已達收藏庫建立上限，請先整理現有收藏後再建立新的收藏庫。
              </div>
            )}

            {!reachedCollectionLimit && reachedPrivateCollectionLimit && (
              <div className="mt-2 rounded-lg border border-amber-400/35 bg-amber-950/35 px-2.5 py-2 text-[12px] text-amber-200">
                私人收藏已達上限，目前只能建立公開收藏。
              </div>
            )}
          </>
        )}
      </div>

      {createError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
          {createError}
        </div>
      )}
    </div>
  );
}
