import { type RowComponentProps } from "react-window";
import type {
  PlaylistIssueListItem,
  PlaylistIssueSummary,
} from "@features/PlaylistSource";

export type PlaylistPreviewItem = {
  title: string;
  uploader?: string;
  duration?: string;
  thumbnail?: string;
};

type PlaylistPreviewRowProps = {
  items: PlaylistPreviewItem[];
};

export type { PlaylistIssueListItem, PlaylistIssueSummary };

type PlaylistIssueRowProps = {
  items: PlaylistIssueListItem[];
};

export const PlaylistPreviewRow = ({
  index,
  style,
  items,
}: RowComponentProps<PlaylistPreviewRowProps>) => {
  const item = items[index];
  return (
    <div style={style} className="px-2 py-1">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--mc-border)]/70 bg-slate-950/25 px-2 py-2">
        <img
          src={
            item.thumbnail || "https://img.youtube.com/vi/default/hqdefault.jpg"
          }
          alt={item.title}
          className="h-10 w-16 rounded object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {item.title}
            {item.duration ? (
              <span className="ml-2 text-xs font-medium text-[var(--mc-text-muted)]">
                {item.duration}
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-[var(--mc-text-muted)]">
            {item.uploader || "未知上傳者"}
          </p>
        </div>
      </div>
    </div>
  );
};

export const PlaylistIssueRow = ({
  index,
  style,
  items,
}: RowComponentProps<PlaylistIssueRowProps>) => {
  const item = items[index];
  return (
    <div style={style} className="px-2 py-1">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--mc-border)]/70 bg-slate-950/25 px-2 py-2">
        <img
          src={
            item.thumbnail || "https://img.youtube.com/vi/default/hqdefault.jpg"
          }
          alt={item.title}
          className="h-10 w-16 rounded object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
            {item.title}
          </p>
          <p className="truncate text-xs text-[var(--mc-text-muted)]">
            {item.reason}
          </p>
        </div>
      </div>
    </div>
  );
};
