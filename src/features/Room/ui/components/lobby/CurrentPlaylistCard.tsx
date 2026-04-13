import React from "react";
import { Button, Chip, Typography, useMediaQuery } from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";

import type { PlaylistSourceType, RoomState } from "../../../model/types";
import { normalizeDisplayText } from "../../lib/roomLobbyPanelUtils";

type CurrentPlaylistCardProps = {
  room: RoomState["room"] | null;
  playlistCount: number;
  isHost: boolean;
  pendingSuggestionCount: number;
  onChange: (initialTab?: "suggestions" | "public") => void;
  changeDisabled?: boolean;
  actionLabel?: string;
};

const sourceTypeConfig: Record<
  PlaylistSourceType,
  {
    label: string;
    icon: React.ReactElement;
  }
> = {
  public_collection: {
    label: "公開題庫",
    icon: <PublicRoundedIcon sx={{ fontSize: 15 }} />,
  },
  private_collection: {
    label: "私人題庫",
    icon: <BookmarkBorderRoundedIcon sx={{ fontSize: 15 }} />,
  },
  youtube_google_import: {
    label: "YouTube",
    icon: <YouTubeIcon sx={{ fontSize: 15 }} />,
  },
  youtube_pasted_link: {
    label: "連結",
    icon: <LinkRoundedIcon sx={{ fontSize: 15 }} />,
  },
};

const getSourceConfig = (sourceType?: PlaylistSourceType | null) =>
  sourceType ? sourceTypeConfig[sourceType] : null;

const playlistChipSx = {
  height: 30,
  borderRadius: "999px",
};

const playlistChipIconSx = {
  marginLeft: "9px",
  marginRight: "-2px",
};

const playlistChipLabelSx = {
  paddingLeft: "9px",
  paddingRight: "11px",
};

const CurrentPlaylistCard = ({
  room,
  playlistCount,
  isHost,
  pendingSuggestionCount,
  onChange,
  changeDisabled = false,
  actionLabel,
}: CurrentPlaylistCardProps) => {
  const isMobileCard = useMediaQuery("(max-width:640px)");
  const thumbnailUrl = room?.playlistCoverThumbnailUrl ?? null;
  const title = normalizeDisplayText(
    room?.playlistTitle ?? room?.playlistCoverTitle,
    "未命名題庫",
  );
  const coverTitle = normalizeDisplayText(
    room?.playlistCoverTitle,
    "目前題庫封面",
  );
  const sourceConfig = getSourceConfig(room?.playlistSourceType ?? null);
  const sourceLabel = sourceConfig?.label ?? "匯入題庫";
  const buttonLabel = actionLabel ?? (isHost ? "更換題庫" : "推薦題庫");
  const canOpenSelector = !changeDisabled;
  const handleCardClick = () => {
    if (!isMobileCard || !canOpenSelector) return;
    onChange("public");
  };
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isMobileCard || !canOpenSelector) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onChange("public");
  };

  return (
    <div
      role={isMobileCard && canOpenSelector ? "button" : undefined}
      tabIndex={isMobileCard && canOpenSelector ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,11,18,0.74),rgba(7,11,18,0.56))] p-4 shadow-[0_24px_44px_-34px_rgba(2,6,23,0.9)] transition max-sm:p-4 ${
        canOpenSelector
          ? "max-sm:cursor-pointer max-sm:hover:border-cyan-300/20 max-sm:hover:bg-[linear-gradient(180deg,rgba(10,18,30,0.8),rgba(7,11,18,0.62))]"
          : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="relative h-[148px] w-full shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.95)] sm:h-[92px] sm:w-[92px] sm:rounded-[22px]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={coverTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.16),transparent_44%),linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.96))] text-cyan-100">
              <LibraryMusicRoundedIcon sx={{ fontSize: 32 }} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:min-h-[92px] sm:justify-between">
            <div className="order-2 flex flex-wrap items-center gap-2.5 sm:order-1">
              <Chip
                size="small"
                icon={sourceConfig?.icon}
                label={sourceLabel}
                sx={{
                  ...playlistChipSx,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.08)",
                  "& .MuiChip-icon": {
                    ...playlistChipIconSx,
                    color: "#cbd5e1",
                  },
                  "& .MuiChip-label": playlistChipLabelSx,
                }}
              />
              <Chip
                size="small"
                icon={<QuizRoundedIcon sx={{ fontSize: 15 }} />}
                label={`${Math.max(0, playlistCount)} 題`}
                sx={{
                  ...playlistChipSx,
                  backgroundColor: "rgba(250,204,21,0.12)",
                  color: "#fde68a",
                  border: "1px solid rgba(250,204,21,0.14)",
                  "& .MuiChip-icon": {
                    ...playlistChipIconSx,
                    color: "#fde68a",
                  },
                  "& .MuiChip-label": playlistChipLabelSx,
                }}
              />
              {isHost && pendingSuggestionCount > 0 ? (
                <Chip
                  size="small"
                  clickable={!changeDisabled}
                  onClick={changeDisabled ? undefined : (e) => {
                    e.stopPropagation();
                    onChange("suggestions");
                  }}
                  icon={<TipsAndUpdatesRoundedIcon sx={{ fontSize: 15 }} />}
                  label={`推薦 ${pendingSuggestionCount}`}
                  sx={{
                    ...playlistChipSx,
                    backgroundColor: "rgba(56,189,248,0.12)",
                    color: "#cffafe",
                    border: "1px solid rgba(56,189,248,0.16)",
                    cursor: changeDisabled ? "default" : "pointer",
                    "& .MuiChip-icon": {
                      ...playlistChipIconSx,
                      color: "#67e8f9",
                    },
                    "& .MuiChip-label": playlistChipLabelSx,
                    "&:hover": changeDisabled
                      ? undefined
                      : {
                          backgroundColor: "rgba(56,189,248,0.18)",
                          borderColor: "rgba(103,232,249,0.32)",
                        },
                  }}
                />
              ) : null}
            </div>

            <Typography
              variant="h5"
              className="order-1 line-clamp-2 !font-semibold !leading-tight !tracking-[-0.03em] !text-slate-50 max-sm:!text-[1.45rem] sm:order-2 sm:mt-4 sm:!text-[1.7rem]"
            >
              {title}
            </Typography>
          </div>

          <Button
            variant="outlined"
            color="inherit"
            disabled={changeDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onChange("public");
            }}
            className="!min-h-[42px] !shrink-0 !rounded-full !border-white/10 !bg-white/[0.02] !px-4 !font-medium !text-slate-200 hover:!border-amber-300/30 hover:!bg-amber-300/[0.08] hover:!text-amber-50 disabled:!border-white/8 disabled:!bg-white/[0.02] disabled:!text-slate-500 max-sm:!min-h-[38px] max-sm:!w-full max-sm:!justify-center max-sm:!border-cyan-300/20 max-sm:!bg-cyan-300/[0.06]"
            startIcon={<SwapHorizRoundedIcon fontSize="small" />}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CurrentPlaylistCard);
