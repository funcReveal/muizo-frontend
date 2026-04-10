import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import {
  BarChartRounded,
  LockOutlined,
  MoreHorizRounded,
  PublicOutlined,
  QuizRounded,
  StarBorderRounded,
  StarRounded,
} from "@mui/icons-material";
import { IconButton, Menu, MenuItem } from "@mui/material";

type CollectionCardProps = {
  collection: {
    id: string;
    title: string;
    cover_title?: string | null;
    cover_duration_sec?: number | null;
    cover_thumbnail_url?: string | null;
    cover_provider?: string | null;
    cover_source_id?: string | null;
    visibility?: string | null;
    use_count?: number | null;
    favorite_count?: number | null;
    item_count?: number | null;
    is_favorited?: boolean | null;
  };
  view: "grid" | "list";
  selected: boolean;
  isPublicLibraryTab: boolean;
  isFavoriteUpdating?: boolean;
  onSelect: () => void;
  onToggleFavorite?: () => void | Promise<void | boolean>;
  formatDurationLabel: (value: number) => string | null;
};

const menuPaperSx = {
  mt: 0.75,
  border: "1px solid var(--mc-border)",
  backgroundColor: "#08111f",
  color: "var(--mc-text)",
  borderRadius: "14px",
  minWidth: 150,
  boxShadow: "0 20px 40px rgba(2,6,23,0.46)",
  "& .MuiMenuItem-root": {
    gap: 1,
    fontSize: 13,
    minHeight: 36,
  },
} as const;

const CollectionCard = ({
  collection,
  view,
  selected,
  isPublicLibraryTab,
  isFavoriteUpdating = false,
  onSelect,
  onToggleFavorite,
  formatDurationLabel,
}: CollectionCardProps) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isActionHovered, setIsActionHovered] = useState(false);
  const previewThumbnail =
    collection.cover_thumbnail_url ||
    (collection.cover_provider === "youtube" && collection.cover_source_id
      ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
      : "");
  const isPublic = (collection.visibility ?? "private") === "public";
  const visibilityLabel = isPublic ? "公開" : "私人";
  const coverTitle =
    collection.cover_title ||
    (isPublicLibraryTab ? "公開收藏精選曲目" : "私人收藏精選曲目");
  const coverDuration = collection.cover_duration_sec
    ? formatDurationLabel(collection.cover_duration_sec)
    : null;
  const canShowActions = isPublicLibraryTab;
  const isFavorited = Boolean(collection.is_favorited);
  const suppressCardHover = isActionHovered || Boolean(menuAnchor);

  const itemCountLabel =
    typeof collection.item_count === "number"
      ? `${Math.max(0, Number(collection.item_count ?? 0))}`
      : null;

  const statsMeta = [
    itemCountLabel
      ? {
          key: "questions",
          icon: (
            <QuizRounded
              sx={{ fontSize: 17, color: "rgba(103, 232, 249, 0.94)" }}
            />
          ),
          label: `${itemCountLabel} 題`,
        }
      : null,
    typeof collection.use_count === "number"
      ? {
          key: "plays",
          icon: (
            <BarChartRounded
              sx={{ fontSize: 18, color: "rgba(125, 211, 252, 0.92)" }}
            />
          ),
          label: `${Math.max(0, Number(collection.use_count ?? 0))}`,
        }
      : null,
    typeof collection.favorite_count === "number"
      ? {
          key: "favorites",
          icon: isFavorited ? (
            <StarRounded
              sx={{ fontSize: 17, color: "rgba(250, 204, 21, 0.95)" }}
            />
          ) : (
            <StarBorderRounded
              sx={{ fontSize: 17, color: "rgba(250, 204, 21, 0.9)" }}
            />
          ),
          label: `${collection.favorite_count}`,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: ReactNode;
    label: string;
  }>;

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
  };

  const handleToggleFavorite = () => {
    void onToggleFavorite?.();
    closeMenu();
  };

  const renderActions = (placement: "grid" | "list") =>
    canShowActions ? (
      <>
        <IconButton
          aria-label="更多收藏庫功能"
          aria-controls={menuAnchor ? `collection-actions-${collection.id}` : undefined}
          aria-haspopup="menu"
          aria-expanded={Boolean(menuAnchor)}
          onClick={openMenu}
          onMouseEnter={() => setIsActionHovered(true)}
          onMouseLeave={() => setIsActionHovered(false)}
          size="small"
          className={
            placement === "grid"
              ? "!h-7 !w-7 !shrink-0 !bg-slate-950/45 !text-slate-100 hover:!bg-slate-900"
              : "!shrink-0 !bg-slate-950/45 !text-slate-100 hover:!bg-slate-900"
          }
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
        <Menu
          id={`collection-actions-${collection.id}`}
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenu}
          onClick={(event) => event.stopPropagation()}
          slotProps={{
            paper: {
              sx: menuPaperSx,
            },
          }}
        >
          <MenuItem
            onClick={handleToggleFavorite}
            disabled={isFavoriteUpdating || !onToggleFavorite}
          >
            {isFavorited ? (
              <StarRounded sx={{ fontSize: 18, color: "rgba(250,204,21,0.95)" }} />
            ) : (
              <StarBorderRounded
                sx={{ fontSize: 18, color: "rgba(250,204,21,0.9)" }}
              />
            )}
            {isFavorited ? "取消收藏" : "加入收藏"}
          </MenuItem>
        </Menu>
      </>
    ) : null;

  if (view === "grid") {
    return (
      <div
        key={collection.id}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleCardKeyDown}
        className={`group relative h-full cursor-pointer overflow-hidden rounded-[22px] border text-left transition ${
          selected
            ? "border-cyan-300/55 bg-slate-950/70 shadow-[0_24px_44px_-28px_rgba(34,211,238,0.45)]"
            : `border-cyan-300/18 bg-slate-950/55 ${
                suppressCardHover
                  ? ""
                  : "hover:border-cyan-300/38 hover:bg-slate-950/72 hover:shadow-[0_22px_42px_-30px_rgba(34,211,238,0.32)]"
              }`
        }`}
      >
        <div className="relative h-36 w-full overflow-hidden bg-slate-900/60">
          {previewThumbnail ? (
            <img
              src={previewThumbnail}
              alt={collection.cover_title ?? collection.title}
              className={`h-full w-full object-cover transition duration-300 ${
                suppressCardHover ? "" : "group-hover:scale-[1.03]"
              }`}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--mc-text-muted)]">
              無封面
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.82)_100%)]" />
          {!isPublicLibraryTab ? (
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm">
                {isPublic ? (
                  <PublicOutlined sx={{ fontSize: 13 }} />
                ) : (
                  <LockOutlined sx={{ fontSize: 13 }} />
                )}
                {visibilityLabel}
              </span>
            </div>
          ) : null}
        </div>
        <div className="space-y-3 px-4 py-3.5">
          <div className="space-y-1.5">
            <p className="truncate text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
              {collection.title}
            </p>
            <div className="flex items-center justify-between gap-3 text-[12px] leading-5 text-slate-300/88">
              <p className="min-w-0 flex-1 truncate">{coverTitle}</p>
              {coverDuration ? (
                <span className="shrink-0 font-medium">{coverDuration}</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap gap-3">
              {statsMeta.length > 0 ? (
                statsMeta.map((meta) => (
                  <span
                    key={`${collection.id}-${meta.key}`}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold leading-none text-slate-200/92"
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                ))
              ) : (
                <span className="text-[11px] leading-none text-[var(--mc-text-muted)]">
                  尚無統計資料
                </span>
              )}
            </div>
            {renderActions("grid")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={collection.id}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition ${
        selected
          ? "border-cyan-300/55 bg-cyan-500/10"
          : `border-cyan-300/25 bg-slate-950/25 ${
              suppressCardHover ? "" : "hover:border-cyan-300/45"
            }`
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-slate-900/40">
          {previewThumbnail ? (
            <img
              src={previewThumbnail}
              alt={collection.cover_title ?? collection.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--mc-text-muted)]">
              無封面
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--mc-text)]">
              {collection.title}
            </p>
            {!isPublicLibraryTab ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] leading-none text-slate-200/88">
                {isPublic ? (
                  <PublicOutlined sx={{ fontSize: 12 }} />
                ) : (
                  <LockOutlined sx={{ fontSize: 12 }} />
                )}
                {visibilityLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-[var(--mc-text-muted)]">
            {coverTitle}
            {coverDuration ? ` · ${coverDuration}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {statsMeta.map((meta) => (
              <span
                key={`${collection.id}-list-${meta.key}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-none text-slate-200/90"
              >
                {meta.icon}
                <span>{meta.label}</span>
              </span>
            ))}
          </div>
        </div>
        {renderActions("list")}
      </div>
    </div>
  );
};

export default CollectionCard;
