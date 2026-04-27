import { useTranslation } from "react-i18next";
import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";

import { MuizoSelect, type MuizoSelectOption } from "@shared/ui/select";

type YoutubePlaylistOption = {
  id: string;
  title: string;
  itemCount: number;
  thumbnail?: string;
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
}: Props) {
  const { t } = useTranslation("collectionCreate");

  const youtubePlaylistOptions: MuizoSelectOption[] = youtubePlaylists.map(
    (playlist) => ({
      value: playlist.id,
      label: playlist.title,
      thumbnail: playlist.thumbnail,
      description: t("source.playlistOption", {
        title: "",
        count: playlist.itemCount,
      }).trim(),
    }),
  );

  const youtubeSelectLoading =
    youtubePlaylistsLoading || isImportingYoutubePlaylist;

  const youtubeSelectPlaceholder = youtubePlaylistsLoading
    ? t("source.playlistSelectLoading")
    : isImportingYoutubePlaylist
      ? t("source.importingYoutube")
      : t("source.playlistSelectPlaceholder");

  return (
    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 p-4">
      <div>
        <div className="text-lg font-semibold text-[var(--mc-text)]">
          {t("source.title")}
        </div>
        <div className="mt-1 text-sm text-[var(--mc-text-muted)]">
          {t("source.description")}
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1 text-[11px]">
        <button
          type="button"
          onClick={() => onPlaylistSourceChange("url")}
          className={`rounded-full px-3 py-1 transition ${
            playlistSource === "url"
              ? "bg-[var(--mc-accent)]/15 text-[var(--mc-text)]"
              : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
          }`}
        >
          {t("source.urlTab")}
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
          {t("source.youtubeTab")}
        </button>
      </div>

      <div className="relative mt-4 min-h-[170px]">
        <div
          className={`space-y-3 transition-all duration-200 ${
            playlistSource === "url"
              ? "translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-2 opacity-0"
          }`}
          hidden={playlistSource !== "url"}
        >
          <div className="p-2 sm:p-3">
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
                label={t("source.playlistUrlLabel")}
                placeholder={t("source.playlistUrlPlaceholder")}
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
                          aria-label={t("source.clearPlaylistUrl")}
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

            <div className="mt-3 text-xs text-[var(--mc-text-muted)]">
              {t("source.playlistUrlHint")}
            </div>

            {playlistLoading ? (
              <div className="mt-4 flex justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-100/90">
                  <CircularProgress
                    size={14}
                    thickness={5}
                    sx={{ color: "#38bdf8" }}
                  />
                  {t("source.loading")}
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
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-2 opacity-0"
          }`}
          hidden={playlistSource !== "youtube"}
        >
          <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
            {(!authUserExists || needsGoogleReauth) && (
              <div className="flex flex-wrap items-center gap-2">
                <span>{t("source.googleLoginHint")}</span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onLoginWithGoogle}
                >
                  {t("source.googleLogin")}
                </Button>
              </div>
            )}

            {youtubePlaylistsError && (
              <span className="text-[11px] text-rose-300">
                {youtubePlaylistsError}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <MuizoSelect
              value={selectedYoutubePlaylistId}
              options={youtubePlaylistOptions}
              placeholder={youtubeSelectPlaceholder}
              loading={youtubeSelectLoading}
              disabled={!authUserExists || needsGoogleReauth}
              emptyText={t("source.playlistSelectPlaceholder")}
              onOpen={onEnsureYoutubePlaylists}
              onChange={(nextId) => {
                onSelectedYoutubePlaylistIdChange(nextId);

                if (!nextId) return;

                void onImportSelectedYoutubePlaylist(nextId);
              }}
            />

            {youtubePlaylistsLoading && (
              <div className="animate-pulse rounded-lg border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 px-3 py-2 text-xs text-[var(--mc-text-muted)]">
                {t("source.playlistLoadingHint")}
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
  );
}
