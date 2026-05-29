import React from "react";
import { Typography } from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

import type { RoomState } from "@features/RoomSession";
import { resolvePlaylistAvailabilityCounts } from "@features/RoomSession/model/playlistAvailability";
import { PlaylistAvailabilityWarningIcon } from "@features/RoomSession/ui/PlaylistAvailabilityBadge";
import type { CollectionOption } from "./roomLobbyPanelTypes";
import { normalizeDisplayText } from "./roomLobbyDisplayUtils";

type CurrentPlaylistCardProps = {
  room: RoomState["room"] | null;
  playlistCount: number;
  playlistPlayableCount?: number | null;
  playlistTotalCount?: number | null;
  isHost: boolean;
  pendingSuggestionCount: number;
  onChange: (initialTab?: "suggestions" | "public") => void;
  changeDisabled?: boolean;
  actionLabel?: string;
  currentCollection?: CollectionOption | null;
};

const formatMetricCount = (value: number | null | undefined) =>
  Math.max(0, Number(value ?? 0)).toLocaleString("zh-TW");

const getFiniteCount = (...values: Array<unknown>) => {
  for (const value of values) {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;

    if (Number.isFinite(numericValue)) {
      return Math.max(0, Math.floor(numericValue));
    }
  }
  return null;
};

const getRecordValue = (source: unknown, key: string) =>
  source && typeof source === "object"
    ? (source as Record<string, unknown>)[key]
    : undefined;

const CurrentPlaylistCard = ({
  room,
  playlistCount,
  playlistPlayableCount,
  playlistTotalCount,
  isHost,
  pendingSuggestionCount,
  onChange,
  changeDisabled = false,
  actionLabel,
  currentCollection = null,
}: CurrentPlaylistCardProps) => {
  const thumbnailUrl = room?.playlistCoverThumbnailUrl ?? null;
  const title = normalizeDisplayText(
    room?.playlistTitle ?? room?.playlistCoverTitle,
    "未命名題庫",
  );
  const coverTitle = normalizeDisplayText(
    room?.playlistCoverTitle,
    "目前題庫封面",
  );
  const buttonLabel = actionLabel ?? (isHost ? "更換題庫" : "推薦題庫");
  const availabilityCounts = resolvePlaylistAvailabilityCounts({
    playlistCount,
    playlistPlayableCount,
    playlistTotalCount,
    playlist: room?.playlist,
  });
  const playlistSource = room?.playlist;
  const playlistSourceType =
    room?.playlistSourceType ?? room?.playlist?.sourceType ?? null;
  const shouldShowRating =
    playlistSourceType !== "youtube_google_import" &&
    playlistSourceType !== "youtube_pasted_link";
  const ratingCount = getFiniteCount(
    currentCollection?.rating_count,
    getRecordValue(playlistSource, "rating_count"),
    getRecordValue(playlistSource, "ratingCount"),
    getRecordValue(room, "playlistRatingCount"),
  );
  const useCount = getFiniteCount(
    currentCollection?.use_count,
    getRecordValue(playlistSource, "use_count"),
    getRecordValue(playlistSource, "useCount"),
    getRecordValue(room, "playlistUseCount"),
  );
  const favoriteCount = getFiniteCount(
    currentCollection?.favorite_count,
    getRecordValue(playlistSource, "favorite_count"),
    getRecordValue(playlistSource, "favoriteCount"),
    getRecordValue(room, "playlistFavoriteCount"),
  );
  const ratingAvg =
    ratingCount !== null && ratingCount > 0
      ? Math.max(
          0,
          Number(
            currentCollection?.rating_avg ??
              getRecordValue(playlistSource, "rating_avg") ??
              getRecordValue(playlistSource, "ratingAvg") ??
              getRecordValue(room, "playlistRatingAvg") ??
              0,
          ),
        )
      : 0;
  const ratingAvgLabel =
    ratingCount !== null && ratingCount > 0
      ? `${ratingAvg.toFixed(ratingAvg % 1 === 0 ? 0 : 1)} / 5`
      : "尚無評分";
  const ratingCountLabel =
    ratingCount !== null && ratingCount > 0
      ? `${formatMetricCount(ratingCount)} 則評分`
      : null;
  const statsMeta = [
    {
      key: "questions",
      icon: (
        <QuizRoundedIcon
          sx={{ fontSize: 16, color: "rgba(103,232,249,0.94)" }}
        />
      ),
      label: `${formatMetricCount(availabilityCounts.playable)} 題`,
    },
    useCount !== null
      ? {
          key: "uses",
          icon: (
            <BarChartRoundedIcon
              sx={{ fontSize: 17, color: "rgba(125,211,252,0.92)" }}
            />
          ),
          label: `${formatMetricCount(useCount)} 次使用`,
        }
      : null,
    favoriteCount !== null
      ? {
          key: "favorites",
          icon: (
            <FavoriteBorderRoundedIcon
              sx={{ fontSize: 16, color: "rgba(251,113,133,0.9)" }}
            />
          ),
          label: `${formatMetricCount(favoriteCount)} 收藏`,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
  }>;
  const canOpenSelector = !changeDisabled;
  const handleCardClick = () => {
    if (!canOpenSelector) return;
    onChange("public");
  };
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenSelector) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onChange("public");
  };

  return (
    <div
      role={canOpenSelector ? "button" : undefined}
      tabIndex={canOpenSelector ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`relative w-full min-w-0 overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,11,18,0.74),rgba(7,11,18,0.56))] p-0 shadow-[0_24px_44px_-34px_rgba(2,6,23,0.9)] transition max-sm:p-4 ${
        canOpenSelector
          ? "cursor-pointer hover:border-cyan-300/20 hover:bg-[linear-gradient(180deg,rgba(10,18,30,0.8),rgba(7,11,18,0.62))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/25"
          : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:min-h-[138px] sm:flex-row sm:items-stretch sm:gap-0">
        <div className="relative h-[148px] w-full shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.95)] sm:h-auto sm:w-[174px] sm:self-stretch sm:rounded-none sm:border-0">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={coverTitle}
              className="h-full w-full scale-[1.36] object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.16),transparent_44%),linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.96))] text-cyan-100">
              <LibraryMusicRoundedIcon sx={{ fontSize: 32 }} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-2.5 sm:h-full">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <Typography
                variant="h5"
                className="flex-1 truncate min-w-0 !font-semibold !leading-tight !tracking-[-0.03em] !text-slate-50 max-sm:!text-[1.45rem] sm:!text-[1.45rem]"
              >
                {title}
              </Typography>

              <span
                aria-hidden="true"
                className={`inline-flex min-h-[24px] shrink-0 items-center justify-center gap-1.5 text-sm font-semibold max-sm:w-full ${
                  changeDisabled ? "text-slate-500" : "text-cyan-100"
                }`}
              >
                <SwapHorizRoundedIcon fontSize="small" />
                {buttonLabel}
              </span>
            </div>

            {shouldShowRating ? (
              <div className="hidden min-w-0 items-center gap-2 text-[12px] leading-5 text-slate-300/88 sm:flex">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <StarRoundedIcon
                    sx={{
                      fontSize: 15,
                      color:
                        ratingCount !== null && ratingCount > 0
                          ? "rgba(250,204,21,0.95)"
                          : "rgba(148,163,184,0.56)",
                    }}
                  />
                  <span className="shrink-0 font-semibold text-slate-100/92">
                    {ratingAvgLabel}
                  </span>
                </span>
                {ratingCountLabel ? (
                  <span className="min-w-0 truncate text-slate-400">
                    {ratingCountLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-auto hidden items-end justify-between gap-4 sm:flex">
              <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                {statsMeta.map((stat) => (
                  <span
                    key={stat.key}
                    className="inline-flex min-w-0 items-center gap-1.5 text-[14px] font-semibold leading-none text-slate-200/92"
                  >
                    {stat.icon}
                    <span className="truncate">{stat.label}</span>
                  </span>
                ))}
              </div>
              <PlaylistAvailabilityWarningIcon
                playable={availabilityCounts.playable}
                total={availabilityCounts.total}
                className="mb-0.5"
              />
            </div>

            {isHost && pendingSuggestionCount > 0 ? (
              <button
                type="button"
                disabled={changeDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange("suggestions");
                }}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan-200/18 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-50 transition hover:border-cyan-200/34 hover:bg-cyan-200/14 disabled:cursor-default disabled:opacity-60"
              >
                <TipsAndUpdatesRoundedIcon sx={{ fontSize: 15 }} />
                推薦 {pendingSuggestionCount}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CurrentPlaylistCard);
