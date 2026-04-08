import React from "react";
import { Button, Chip, Typography } from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";

import type { PlaylistSourceType, RoomState } from "../../model/types";
import { normalizeDisplayText } from "./roomLobbyPanelUtils";

type CurrentPlaylistCardProps = {
  room: RoomState["room"] | null;
  playlistCount: number;
  isHost: boolean;
  pendingSuggestionCount: number;
  onChange: () => void;
  changeDisabled?: boolean;
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
    label: "個人題庫",
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

const CurrentPlaylistCard = ({
  room,
  playlistCount,
  isHost,
  pendingSuggestionCount,
  onChange,
  changeDisabled = false,
}: CurrentPlaylistCardProps) => {
  const thumbnailUrl = room?.playlistCoverThumbnailUrl ?? null;
  const title = normalizeDisplayText(
    room?.playlistTitle ?? room?.playlistCoverTitle,
    "目前題庫",
  );
  const coverTitle = normalizeDisplayText(
    room?.playlistCoverTitle,
    "尚未設定封面歌曲",
  );
  const sourceConfig = getSourceConfig(room?.playlistSourceType ?? null);
  const sourceLabel = sourceConfig?.label ?? "房間題庫";

  return (
    <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,11,18,0.74),rgba(7,11,18,0.56))] p-4 shadow-[0_24px_44px_-34px_rgba(2,6,23,0.9)]">
      <div className="flex items-start gap-4">
        <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/70 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.95)]">
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

        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                size="small"
                icon={sourceConfig?.icon}
                label={sourceLabel}
                sx={{
                  height: 28,
                  borderRadius: "999px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.08)",
                  "& .MuiChip-icon": { color: "#cbd5e1" },
                }}
              />
              <Chip
                size="small"
                label={`${Math.max(0, playlistCount)} 題`}
                sx={{
                  height: 28,
                  borderRadius: "999px",
                  backgroundColor: "rgba(250,204,21,0.12)",
                  color: "#fde68a",
                  border: "1px solid rgba(250,204,21,0.14)",
                }}
              />
              {isHost && pendingSuggestionCount > 0 ? (
                <Chip
                  size="small"
                  icon={<TipsAndUpdatesRoundedIcon sx={{ fontSize: 15 }} />}
                  label={`建議 ${pendingSuggestionCount}`}
                  sx={{
                    height: 28,
                    borderRadius: "999px",
                    backgroundColor: "rgba(56,189,248,0.12)",
                    color: "#cffafe",
                    border: "1px solid rgba(56,189,248,0.16)",
                    "& .MuiChip-icon": { color: "#67e8f9" },
                  }}
                />
              ) : null}
            </div>

            <Typography
              variant="h5"
              className="mt-3 line-clamp-2 !font-semibold !tracking-[-0.03em] !text-slate-50 sm:!text-[1.7rem]"
            >
              {title}
            </Typography>

            <Typography
              variant="body2"
              className="mt-2 line-clamp-1 !text-slate-300/72"
            >
              {coverTitle}
            </Typography>
          </div>

          <Button
            variant="outlined"
            color="inherit"
            disabled={changeDisabled}
            onClick={onChange}
            className="!min-h-[42px] !shrink-0 !rounded-full !border-white/10 !bg-white/[0.02] !px-4 !font-medium !text-slate-200 hover:!border-amber-300/30 hover:!bg-amber-300/[0.08] hover:!text-amber-50 disabled:!border-white/8 disabled:!bg-white/[0.02] disabled:!text-slate-500"
            startIcon={<SwapHorizRoundedIcon fontSize="small" />}
          >
            更換題庫
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CurrentPlaylistCard);
