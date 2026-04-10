import { Button, Skeleton } from "@mui/material";
import {
  GroupsRounded,
  LockRounded,
  PublicOutlined,
  QuizRounded,
} from "@mui/icons-material";

import { PLAYER_MIN } from "../../../../model/roomConstants";
import type { SourceSummary } from "../../../lib/roomsHubViewModels";

type RoomSetupSidebarSummaryProps = {
  roomNameInput: string;
  roomVisibilityInput: "public" | "private";
  parsedMaxPlayers: number | null;
  questionCount: number;
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
  selectedCreateSourceSummary,
  isSourceSummaryLoading,
  createRequirementsHintText,
  createRecommendationHintText,
  canCreateRoom,
  isCreatingRoom,
  onCreateRoom,
}: RoomSetupSidebarSummaryProps) => (
  <section>
    <div className="space-y-3">
      {isSourceSummaryLoading ? (
        <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
          <Skeleton
            variant="rectangular"
            animation="wave"
            height={112}
            sx={{ bgcolor: "rgba(148, 163, 184, 0.14)" }}
          />
          <div className="p-3">
            <p className="pt-2 text-xs text-cyan-100/80">讀取題庫資訊中...</p>
          </div>
        </div>
      ) : selectedCreateSourceSummary ? (
        <div className="overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-500/6">
          {selectedCreateSourceSummary.thumbnail ? (
            <div className="relative h-28 w-full overflow-hidden bg-slate-950/40">
              <img
                src={selectedCreateSourceSummary.thumbnail}
                alt={selectedCreateSourceSummary.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
                {selectedCreateSourceSummary.label}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--mc-text)]">
                {selectedCreateSourceSummary.title}
              </p>
              <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                {selectedCreateSourceSummary.detail}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-500/6 p-3 text-xs text-cyan-100/90">
          尚未選擇題庫，回到題庫來源後即可挑選。
        </div>
      )}

      <div className="grid gap-2">
        <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
          <div className="flex min-h-12 items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
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

        <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
          <div className="flex min-h-12 items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
              <GroupsRounded sx={{ fontSize: 16, color: "#7dd3fc" }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                {parsedMaxPlayers ?? PLAYER_MIN} 人
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
          <div className="flex min-h-12 items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
              <QuizRounded sx={{ fontSize: 16, color: "#fbbf24" }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--mc-text)]">
                {questionCount} 題
              </p>
            </div>
          </div>
        </div>
      </div>

      {createRequirementsHintText || createRecommendationHintText ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {createRequirementsHintText || createRecommendationHintText}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
          題庫與房間設定都已就緒，可以開始建立房間。
        </div>
      )}
    </div>

    <div className="mt-3">
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

export default RoomSetupSidebarSummary;
