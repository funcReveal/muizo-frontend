import { PlayCircleOutlineRounded, YouTube } from "@mui/icons-material";

type YoutubePlaylistCardProps = {
  playlist: {
    id: string;
    title: string;
    thumbnail?: string | null;
    itemCount: number;
  };
  view: "grid" | "list";
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onSelect: () => void;
};

const YoutubePlaylistCard = ({
  playlist,
  view,
  selected,
  disabled = false,
  disabledReason,
  onSelect,
}: YoutubePlaylistCardProps) => {
  const itemCountLabel = `${playlist.itemCount} 首`;

  if (view === "grid") {
    return (
      <button
        key={playlist.id}
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={`group h-full overflow-hidden rounded-[22px] border text-left transition ${
          disabled
            ? "cursor-not-allowed border-white/10 bg-slate-950/42 opacity-70"
            : selected
            ? "border-rose-300/50 bg-slate-950/70 shadow-[0_24px_44px_-28px_rgba(251,113,133,0.4)]"
            : "border-rose-300/16 bg-slate-950/55 hover:border-rose-300/34 hover:bg-slate-950/72 hover:shadow-[0_22px_42px_-30px_rgba(251,113,133,0.28)]"
        }`}
      >
        <div className="relative h-36 w-full overflow-hidden bg-slate-900/60">
          {playlist.thumbnail ? (
            <img
              src={playlist.thumbnail}
              alt={playlist.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--mc-text-muted)]">
              無縮圖
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.82)_100%)]" />
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-rose-100 backdrop-blur-sm">
              <YouTube sx={{ fontSize: 13 }} />
              YouTube
            </span>
          </div>
          {disabledReason ? (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-300/30 bg-slate-950/78 px-3 py-2 text-xs font-semibold text-amber-100 shadow-[0_16px_34px_-24px_rgba(251,191,36,0.55)]">
              {disabledReason}
            </div>
          ) : null}
        </div>
        <div className="space-y-3 px-4 py-3.5">
          <div className="space-y-1.5">
            <p className="line-clamp-1 text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
              {playlist.title}
            </p>
            <p className="line-clamp-2 min-h-[2.5rem] text-[12px] leading-5 text-slate-300/88">
              {disabledReason ?? "YouTube 播放清單匯入來源"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold leading-none text-slate-200/92">
              <PlayCircleOutlineRounded
                sx={{ fontSize: 18, color: "rgba(251, 113, 133, 0.92)" }}
              />
              <span>{itemCountLabel}</span>
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      key={playlist.id}
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-xl border text-left transition ${
        disabled
          ? "cursor-not-allowed border-white/10 bg-slate-950/20 opacity-70"
          : selected
          ? "border-rose-300/50 bg-rose-500/10"
          : "border-rose-300/18 bg-slate-950/25 hover:border-rose-300/34"
      } flex w-full items-center gap-3 px-3 py-2`}
    >
      <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-slate-900/40">
        {playlist.thumbnail ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--mc-text-muted)]">
            無縮圖
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {playlist.title}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] leading-none text-rose-100/90">
            <YouTube sx={{ fontSize: 12, marginRight: "4px" }} />
            YouTube
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--mc-text-muted)]">
          {disabledReason ?? "YouTube 播放清單匯入來源"}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-none text-slate-200/90">
            <PlayCircleOutlineRounded
              sx={{ fontSize: 17, color: "rgba(251, 113, 133, 0.92)" }}
            />
            <span>{itemCountLabel}</span>
          </span>
        </div>
      </div>
    </button>
  );
};

export default YoutubePlaylistCard;
