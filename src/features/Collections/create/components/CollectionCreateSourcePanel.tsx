import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";

import { MuizoSelect, type MuizoSelectOption } from "@shared/ui/select";
import type { CollectionCreateImportSource } from "../hooks/useCollectionCreateImportSources";

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

  youtubePlaylistsLoading: boolean;
  youtubePlaylistsError: string | null;
  youtubePlaylists: YoutubePlaylistOption[];
  selectedYoutubePlaylistId: string;
  onSelectedYoutubePlaylistIdChange: (value: string) => void;
  youtubeActionError: string | null;
  isImportingYoutubePlaylist: boolean;
  onEnsureYoutubePlaylists: () => void;
  onImportSelectedYoutubePlaylist: (playlistId: string) => Promise<void>;

  importSources: CollectionCreateImportSource[];
  totalImportedItemCount: number;
  onRemoveImportSource: (sourceId: string) => void;
  onClearImportSources: () => void;
};

const getSourceTypeLabelKey = (type: CollectionCreateImportSource["type"]) => {
  if (type === "youtube_account_playlist") {
    return "source.sourceTypeYoutubeAccount";
  }

  return "source.sourceTypeYoutubeUrl";
};

export default function CollectionCreateSourcePanel({
  authUserExists,
  needsGoogleReauth,
  onLoginWithGoogle,

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

  youtubePlaylistsLoading,
  youtubePlaylistsError,
  youtubePlaylists,
  selectedYoutubePlaylistId,
  onSelectedYoutubePlaylistIdChange,
  youtubeActionError,
  isImportingYoutubePlaylist,
  onEnsureYoutubePlaylists,
  onImportSelectedYoutubePlaylist,

  importSources,
  totalImportedItemCount,
  onRemoveImportSource,
  onClearImportSources,
}: Props) {
  const { t } = useTranslation("collectionCreate");

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

  const sourceTabBaseClass =
    "rounded-full px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-50";

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
          disabled={sourceSwitchDisabled}
          onClick={() => onPlaylistSourceChange("url")}
          className={`${sourceTabBaseClass} ${
            playlistSource === "url"
              ? "bg-[var(--mc-accent)]/15 text-[var(--mc-text)]"
              : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
          }`}
        >
          {t("source.urlTab")}
        </button>

        <button
          type="button"
          disabled={sourceSwitchDisabled}
          onClick={() => onPlaylistSourceChange("youtube")}
          className={`${sourceTabBaseClass} ${
            playlistSource === "youtube"
              ? "bg-[var(--mc-accent-2)]/15 text-[var(--mc-text)]"
              : "text-[var(--mc-text-muted)] hover:text-[var(--mc-text)]"
          }`}
        >
          {t("source.youtubeTab")}
        </button>
      </div>

      {sourceSwitchDisabled && (
        <div className="mt-2 text-[11px] text-[var(--mc-text-muted)]">
          {t("source.sourceSwitchDisabledHint")}
        </div>
      )}

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
                onChange={(e) => {
                  if (playlistUrlReadOnly) return;
                  onPlaylistUrlChange(e.target.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key !== "Enter" ||
                    playlistLoading ||
                    playlistUrlReadOnly
                  ) {
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
                          aria-label={
                            hasResolvedPlaylist
                              ? t("source.reselectPlaylist")
                              : t("source.clearPlaylistUrl")
                          }
                          sx={{ color: "rgba(148,163,184,0.92)" }}
                        >
                          <CloseRounded fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                  htmlInput: {
                    readOnly: playlistUrlReadOnly,
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
              {hasResolvedPlaylist
                ? t("source.playlistLockedHint")
                : t("source.playlistUrlHint")}
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

      <div className="mt-4 rounded-2xl border border-[var(--mc-border)] bg-[rgba(2,6,23,0.22)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--mc-text)]">
              {t("source.importedSourcesTitle")}
            </div>
            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
              {importSources.length > 0
                ? t("source.importedSourcesDescription", {
                    sourceCount: importSources.length,
                    itemCount: totalImportedItemCount,
                  })
                : t("source.importedSourcesEmpty")}
            </div>
          </div>

          {importSources.length > 1 && (
            <button
              type="button"
              onClick={onClearImportSources}
              className="rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/15"
            >
              {t("source.clearAllSources")}
            </button>
          )}
        </div>

        {importSources.length > 0 && (
          <div className="mt-3 space-y-2">
            {importSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/45 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                      {t(getSourceTypeLabelKey(source.type))}
                    </span>

                    <span className="truncate text-sm font-semibold text-[var(--mc-text)]">
                      {source.title}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--mc-text-muted)]">
                    <span>
                      {t("source.importedSourceCount", {
                        count: source.itemCount,
                      })}
                    </span>

                    {source.skippedCount > 0 && (
                      <span className="text-amber-200">
                        {t("source.importedSourceSkipped", {
                          count: source.skippedCount,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <IconButton
                  size="small"
                  onClick={() => onRemoveImportSource(source.id)}
                  aria-label={t("source.removeImportSource", {
                    title: source.title,
                  })}
                  sx={{
                    color: "rgba(248, 113, 113, 0.92)",
                    border: "1px solid rgba(248, 113, 113, 0.22)",
                    backgroundColor: "rgba(248, 113, 113, 0.08)",
                    "&:hover": {
                      backgroundColor: "rgba(248, 113, 113, 0.16)",
                    },
                  }}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
