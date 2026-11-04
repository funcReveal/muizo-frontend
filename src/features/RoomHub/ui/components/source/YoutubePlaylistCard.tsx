import { PlayCircleOutlineRounded, YouTube } from "@mui/icons-material";
import "./collectionCard.css";

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
        aria-pressed={selected}
        data-selected={selected}
        data-disabled={disabled}
        data-action-active="false"
        className="hub-collection-card hub-collection-card--grid group h-full w-full overflow-hidden text-left"
      >
        <div className="hub-collection-card__cover relative h-36 w-full overflow-hidden">
          {playlist.thumbnail ? (
            <img
              src={playlist.thumbnail}
              alt={playlist.title}
              className="hub-collection-card__image h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--mc-text-muted)]">
              無縮圖
            </div>
          )}
          <div className="hub-collection-card__shade pointer-events-none absolute inset-0" />
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
        <div className="hub-collection-card__body space-y-2.5 px-4 py-3">
          <div className="space-y-1">
            <p className="hub-collection-card__title line-clamp-1 text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
              {playlist.title}
            </p>
            <p className="line-clamp-1 text-[12px] leading-5 text-slate-300/88">
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
      aria-pressed={selected}
      data-selected={selected}
      data-disabled={disabled}
      data-action-active="false"
      className="hub-collection-card hub-collection-card--list flex w-full items-center gap-3 px-3 py-3 text-left"
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
