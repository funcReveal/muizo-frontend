import { Button, Skeleton } from "@mui/material";
import {
  EmojiEventsRounded,
  GroupsRounded,
  LockRounded,
  MeetingRoomRounded,
  PublicOutlined,
  QuizRounded,
} from "@mui/icons-material";

import { PLAYER_MIN } from "@domain/room/constants";
import type { SourceSummary } from "../../roomsHubViewModels";
import {
  getLeaderboardModeLabel,
  getLeaderboardVariant,
  type LeaderboardModeKey,
  type LeaderboardVariantKey,
  type RoomPlayMode,
} from "../../../model/leaderboardChallengeOptions";

type RoomSetupSidebarSummaryProps = {
  roomNameInput: string;
  roomVisibilityInput: "public" | "private";
  parsedMaxPlayers: number | null;
  questionCount: number;
  roomPlayMode: RoomPlayMode;
  selectedLeaderboardMode: LeaderboardModeKey;
  selectedLeaderboardVariant: LeaderboardVariantKey;
  selectedCreateSourceSummary: SourceSummary;
  isSourceSummaryLoading: boolean;
  createRequirementsHintText: string | null;
  createRecommendationHintText: string | null;
  canCreateRoom: boolean;
  isCreatingRoom: boolean;
  onCreateRoom: () => void;
};

const RoomSetupSidebarSummary = ({
  roomVisibilityInput,
  parsedMaxPlayers,
  questionCount,
  roomPlayMode,
  selectedLeaderboardMode,
  selectedLeaderboardVariant,
  selectedCreateSourceSummary,
  isSourceSummaryLoading,
  // createRequirementsHintText,
  // createRecommendationHintText,
  canCreateRoom,
  isCreatingRoom,
  onCreateRoom,
}: RoomSetupSidebarSummaryProps) => {
  const activeLeaderboardVariant = getLeaderboardVariant(
    selectedLeaderboardMode,
    selectedLeaderboardVariant,
  );
  const activeLeaderboardModeLabel = getLeaderboardModeLabel(
    selectedLeaderboardMode,
  );
  const isLeaderboardRoom = roomPlayMode === "leaderboard";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {isSourceSummaryLoading ? (
          <div className="min-h-0 overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
            <Skeleton
              variant="rectangular"
              animation="wave"
              height={80}
              sx={{ bgcolor: "rgba(148, 163, 184, 0.14)" }}
            />
            <div className="p-2.5">
              <p className="pt-2 text-xs text-cyan-100/80">讀取題庫資訊中...</p>
            </div>
          </div>
        ) : selectedCreateSourceSummary ? (
          <div className="min-h-0 shrink overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
            {selectedCreateSourceSummary.thumbnail ? (
              <div className="relative h-[clamp(3.75rem,12vh,6.5rem)] w-full overflow-hidden bg-slate-950/40">
                <img
                  src={selectedCreateSourceSummary.thumbnail}
                  alt={selectedCreateSourceSummary.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div className="p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
                  {selectedCreateSourceSummary.label}
                </p>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--mc-text)]">
                  {selectedCreateSourceSummary.title}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-[var(--mc-text-muted)]">
                  {selectedCreateSourceSummary.detail}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-500/6 p-3 text-xs text-cyan-100/90">
            尚未選擇題庫，回到題庫來源後即可挑選。
          </div>
        )}

        <div className="grid shrink-0 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
            <div className="flex min-h-10 items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                {isLeaderboardRoom ? (
                  <EmojiEventsRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
                ) : (
                  <MeetingRoomRounded sx={{ fontSize: 16, color: "#34d399" }} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--mc-text)]">
                  {isLeaderboardRoom ? "排行挑戰" : "休閒派對"}
                </p>
                {isLeaderboardRoom ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--mc-text-muted)]">
                    {activeLeaderboardModeLabel} ·{" "}
                    {activeLeaderboardVariant.label}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
            <div className="flex min-h-10 items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                {roomVisibilityInput === "private" ? (
                  <LockRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
                ) : (
                  <PublicOutlined sx={{ fontSize: 16, color: "#7dd3fc" }} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--mc-text)]">
                  {roomVisibilityInput === "private" ? "私人房間" : "公開房間"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
            <div className="flex min-h-10 items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                <GroupsRounded sx={{ fontSize: 16, color: "#7dd3fc" }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--mc-text)]">
                  {parsedMaxPlayers ?? PLAYER_MIN} 人
                </p>
              </div>
            </div>
          </div>

          {!isLeaderboardRoom ? (
            <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
              <div className="flex min-h-10 items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                  <QuizRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--mc-text)]">
                    {questionCount} 題
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto shrink-0 pt-3">
        <Button
          variant="contained"
          fullWidth
          onClick={onCreateRoom}
          disabled={!canCreateRoom}
        >
          {isCreatingRoom ? "建立中..." : "建立房間"}
        </Button>
      </div>
    </section>
  );
};

export default RoomSetupSidebarSummary;
