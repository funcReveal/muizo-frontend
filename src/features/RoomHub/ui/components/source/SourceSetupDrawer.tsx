import {
  ChairRounded,
  CloseRounded,
  PlayArrowRounded,
  YouTube,
  LinkRounded,
} from "@mui/icons-material";
import { Button, Drawer, IconButton, useMediaQuery } from "@mui/material";

import type { RoomCreateSourceMode } from "@domain/room/types";
import type { PlaybackExtensionMode } from "@domain/room/types";
import RoomSetupPanel from "../setup/RoomSetupPanel";
import type { CreateSettingsCard, SourceSummary } from "../../roomsHubViewModels";
import type {
  LeaderboardModeKey,
  LeaderboardVariantKey,
  RoomPlayMode,
} from "../../../model/leaderboardChallengeOptions";

type SourceSetupKind = "youtube" | "link";

type SourceSetupDrawerProps = {
  open: boolean;
  kind: SourceSetupKind | null;
  sourceSummary: SourceSummary;
  onClose: () => void;
  roomNameInput: string;
  setRoomNameInput: (value: string) => void;
  roomVisibilityInput: "public" | "private";
  setRoomVisibilityInput: (value: "public" | "private") => void;
  roomPasswordInput: string;
  setRoomPasswordInput: (value: string) => void;
  isPinProtectionEnabled: boolean;
  setIsPinProtectionEnabled: (value: boolean) => void;
  pinValidationAttempted?: boolean;
  setRoomMaxPlayersInput: (value: string) => void;
  parsedMaxPlayers: number | null;
  questionCount: number;
  questionMin: number;
  questionMaxLimit: number;
  updateQuestionCount: (value: number) => void;
  setRoomPlayMode: (value: RoomPlayMode) => void;
  playDurationSec: number;
  revealDurationSec: number;
  startOffsetSec: number;
  allowCollectionClipTiming: boolean;
  updatePlayDurationSec: (value: number) => number;
  updateRevealDurationSec: (value: number) => number;
  updateStartOffsetSec: (value: number) => number;
  updateAllowCollectionClipTiming: (value: boolean) => boolean;
  playbackExtensionMode: PlaybackExtensionMode;
  setPlaybackExtensionMode: (value: PlaybackExtensionMode) => void;
  createSettingsCards: CreateSettingsCard[];
  createRequirementsHintText: string | null;
  createRecommendationHintText: string | null;
  canCreateRoom: boolean;
  isCreatingRoom: boolean;
  isSourceLoading: boolean;
  selectedLeaderboardMode: LeaderboardModeKey;
  selectedLeaderboardVariant: LeaderboardVariantKey;
  onLeaderboardSelectionChange: (
    mode: LeaderboardModeKey,
    variant: LeaderboardVariantKey,
  ) => void;
  onCreateRoom: () => void;
};

const sourceModeByKind: Record<SourceSetupKind, RoomCreateSourceMode> = {
  youtube: "youtube",
  link: "link",
};

const SourceSetupDrawer = ({
  open,
  kind,
  sourceSummary,
  onClose,
  roomNameInput,
  setRoomNameInput,
  roomVisibilityInput,
  setRoomVisibilityInput,
  roomPasswordInput,
  setRoomPasswordInput,
  isPinProtectionEnabled,
  setIsPinProtectionEnabled,
  pinValidationAttempted = false,
  setRoomMaxPlayersInput,
  parsedMaxPlayers,
  questionCount,
  questionMin,
  questionMaxLimit,
  updateQuestionCount,
  setRoomPlayMode,
  playDurationSec,
  revealDurationSec,
  startOffsetSec,
  allowCollectionClipTiming,
  updatePlayDurationSec,
  updateRevealDurationSec,
  updateStartOffsetSec,
  updateAllowCollectionClipTiming,
  playbackExtensionMode,
  setPlaybackExtensionMode,
  createSettingsCards,
  createRequirementsHintText,
  createRecommendationHintText,
  canCreateRoom,
  isCreatingRoom,
  isSourceLoading,
  selectedLeaderboardMode,
  selectedLeaderboardVariant,
  onLeaderboardSelectionChange,
  onCreateRoom,
}: SourceSetupDrawerProps) => {
  const isCompact = useMediaQuery("(max-width:767px)");
  const effectiveKind = kind ?? "link";
  const sourceIcon =
    effectiveKind === "youtube" ? (
      <YouTube sx={{ fontSize: 18 }} />
    ) : (
      <LinkRounded sx={{ fontSize: 18 }} />
    );
  const sourceLabel =
    effectiveKind === "youtube" ? "YouTube 播放清單" : "清單連結";
  const primaryLabel = isCreatingRoom
    ? "建立房間中..."
    : isSourceLoading
      ? "載入清單中..."
      : "建立休閒派對";

  return (
    <Drawer
      anchor={isCompact ? "bottom" : "right"}
      open={open}
      onClose={isCreatingRoom ? undefined : onClose}
      slotProps={{
        paper: {
          sx: {
            width: isCompact ? "100%" : "min(860px, 90vw)",
            height: isCompact ? "100dvh" : "100%",
            maxHeight: "100dvh",
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
            color: "#e2e8f0",
            borderLeft: isCompact ? "none" : "1px solid rgba(103,232,249,0.14)",
          },
        },
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-300/12 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/55">
              休閒派對
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-50 sm:text-xl">
              房間設定
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">
              Esc 關閉
            </span>
            <IconButton
              aria-label="關閉房間設定，或按 Esc"
              disabled={isCreatingRoom}
              onClick={onClose}
              className="!text-slate-100 hover:!bg-white/8"
            >
              <CloseRounded />
            </IconButton>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-none">
          <aside className="border-b border-cyan-300/12 bg-slate-950/30 px-4 py-3 md:border-b-0 md:border-r md:px-5 md:py-5">
            <div className="flex min-w-0 items-center gap-3 md:block">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900/80 md:h-auto md:w-full md:aspect-[16/9]">
                {sourceSummary?.thumbnail ? (
                  <img
                    src={sourceSummary.thumbnail}
                    alt={sourceSummary.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    {sourceIcon}
                  </div>
                )}
              </div>
              <div className="min-w-0 md:mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  {sourceIcon}
                  {sourceLabel}
                </span>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-50">
                  {sourceSummary?.title ?? "播放清單"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sourceSummary?.detail ?? "清單載入中"}
                </p>
              </div>
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <RoomSetupPanel
              roomNameInput={roomNameInput}
              setRoomNameInput={setRoomNameInput}
              roomVisibilityInput={roomVisibilityInput}
              setRoomVisibilityInput={setRoomVisibilityInput}
              roomPasswordInput={roomPasswordInput}
              setRoomPasswordInput={setRoomPasswordInput}
              isPinProtectionEnabled={isPinProtectionEnabled}
              setIsPinProtectionEnabled={setIsPinProtectionEnabled}
              pinValidationAttempted={pinValidationAttempted}
              setRoomMaxPlayersInput={setRoomMaxPlayersInput}
              parsedMaxPlayers={parsedMaxPlayers}
              questionCount={questionCount}
              questionMin={questionMin}
              questionMaxLimit={questionMaxLimit}
              updateQuestionCount={updateQuestionCount}
              roomPlayMode="casual"
              setRoomPlayMode={setRoomPlayMode}
              roomCreateSourceMode={sourceModeByKind[effectiveKind]}
              selectedLeaderboardMode={selectedLeaderboardMode}
              selectedLeaderboardVariant={selectedLeaderboardVariant}
              onLeaderboardSelectionChange={onLeaderboardSelectionChange}
              playDurationSec={playDurationSec}
              revealDurationSec={revealDurationSec}
              startOffsetSec={startOffsetSec}
              allowCollectionClipTiming={allowCollectionClipTiming}
              updatePlayDurationSec={updatePlayDurationSec}
              updateRevealDurationSec={updateRevealDurationSec}
              updateStartOffsetSec={updateStartOffsetSec}
              updateAllowCollectionClipTiming={updateAllowCollectionClipTiming}
              playbackExtensionMode={playbackExtensionMode}
              setPlaybackExtensionMode={setPlaybackExtensionMode}
              supportsCollectionClipTiming={false}
              selectedCreateSourceSummary={sourceSummary}
              isSourceSummaryLoading={isSourceLoading}
              createSettingsCards={createSettingsCards}
              createRequirementsHintText={createRequirementsHintText}
              createRecommendationHintText={createRecommendationHintText}
              canCreateRoom={canCreateRoom}
              isCreatingRoom={isCreatingRoom}
              onCreateRoom={onCreateRoom}
              showLeaderboardMode={false}
            />
          </main>
        </div>

        <footer className="grid shrink-0 gap-3 border-t border-cyan-300/12 px-4 py-3 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/55">
              確認房間
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-100">
              休閒派對
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={isSourceLoading ? <ChairRounded /> : <PlayArrowRounded />}
            disabled={!canCreateRoom || isSourceLoading || isCreatingRoom}
            onClick={onCreateRoom}
          >
            {primaryLabel}
          </Button>
        </footer>
      </div>
    </Drawer>
  );
};

export default SourceSetupDrawer;
