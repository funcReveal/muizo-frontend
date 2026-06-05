import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  BarChartRounded,
  FavoriteBorderRounded,
  FavoriteRounded,
  LockOutlined,
  MoreHorizRounded,
  PublicOutlined,
  QuizRounded,
  StarRounded,
} from "@mui/icons-material";
import { IconButton, Menu, MenuItem } from "@mui/material";
import {
  formatCollectionAvailabilityMetricLabel,
  resolveCollectionAvailabilityCounts,
} from "@features/RoomSession/model/playlistAvailability";
import { PlaylistAvailabilityWarningIcon } from "@features/RoomSession/ui/PlaylistAvailabilityBadge";
import { useSubTagsQuery } from "@features/CollectionCategory";

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
    rating_count?: number | null;
    rating_avg?: number | null;
    item_count?: number | null;
    playable_item_count?: number | null;
    is_favorited?: boolean | null;
    category?: {
      key: string;
      label: string;
      parentLabel?: string | null;
    } | null;
    sub_tag_keys?: string[] | null;
  };
  view: "grid" | "list";
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  isPublicLibraryTab: boolean;
  isFavoriteUpdating?: boolean;
  onSelect: () => void;
  onToggleFavorite?: () => void | Promise<void | boolean>;
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
  disabled = false,
  disabledReason = null,
  isPublicLibraryTab,
  isFavoriteUpdating = false,
  onSelect,
  onToggleFavorite,
}: CollectionCardProps) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isActionHovered, setIsActionHovered] = useState(false);
  const { data: subTags = [] } = useSubTagsQuery();
  const subTagLabels = (collection.sub_tag_keys ?? [])
    .map((k) => subTags.find((t) => t.key === k)?.label)
    .filter((l): l is string => Boolean(l));
  const previewThumbnail =
    collection.cover_thumbnail_url ||
    (collection.cover_provider === "youtube" && collection.cover_source_id
      ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
      : "");
  const isPublic = (collection.visibility ?? "private") === "public";
  const visibilityLabel = isPublic ? "公開" : "私人";
  const ratingCount = Math.max(0, Number(collection.rating_count ?? 0));
  const ratingAvg =
    ratingCount > 0 ? Math.max(0, Number(collection.rating_avg ?? 0)) : 0;
  const ratingAvgLabel =
    ratingCount > 0
      ? `${ratingAvg.toFixed(ratingAvg % 1 === 0 ? 0 : 1)} / 5`
      : "尚無評分";
  const ratingCountLabel = ratingCount > 0 ? `${ratingCount} 則評分` : null;
  const canShowActions = isPublicLibraryTab;
  const isFavorited = Boolean(collection.is_favorited);
  const suppressCardHover = isActionHovered || Boolean(menuAnchor);

  const itemCountLabel =
    typeof collection.item_count === "number"
      ? formatCollectionAvailabilityMetricLabel(collection)
      : null;
  const availabilityCounts = resolveCollectionAvailabilityCounts(collection);

  const statsMeta = [
    itemCountLabel
      ? {
          key: "questions",
          icon: (
            <QuizRounded
              sx={{ fontSize: 17, color: "rgba(103, 232, 249, 0.94)" }}
            />
          ),
          label: itemCountLabel,
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
            <FavoriteRounded
              sx={{ fontSize: 17, color: "rgba(251, 113, 133, 0.95)" }}
            />
          ) : (
            <FavoriteBorderRounded
              sx={{ fontSize: 17, color: "rgba(251, 113, 133, 0.9)" }}
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
    if (disabled) return;
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
          aria-controls={
            menuAnchor ? `collection-actions-${collection.id}` : undefined
          }
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
              <FavoriteRounded
                sx={{ fontSize: 18, color: "rgba(251,113,133,0.95)" }}
              />
            ) : (
              <FavoriteBorderRounded
                sx={{ fontSize: 18, color: "rgba(251,113,133,0.9)" }}
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
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onSelect();
        }}
        onKeyDown={handleCardKeyDown}
        className={`group relative h-full cursor-pointer overflow-hidden rounded-[22px] border text-left transition ${
          disabled
            ? "cursor-not-allowed border-white/10 bg-slate-950/42 opacity-75"
            : selected
            ? "border-cyan-300/55 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(8,47,73,0.42))] shadow-[0_24px_44px_-28px_rgba(34,211,238,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
            : `border-cyan-300/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.58))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_34px_-32px_rgba(15,23,42,0.9)] ${
                suppressCardHover
                  ? ""
                  : "hover:border-cyan-300/38 hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(8,47,73,0.44))] hover:shadow-[0_22px_42px_-30px_rgba(34,211,238,0.32),inset_0_1px_0_rgba(255,255,255,0.06)]"
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
          <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-1.5">
            {!isPublicLibraryTab ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm">
                {isPublic ? (
                  <PublicOutlined sx={{ fontSize: 13 }} />
                ) : (
                  <LockOutlined sx={{ fontSize: 13 }} />
                )}
                {visibilityLabel}
              </span>
            ) : null}
            {/* Language chips — solid dark base for legibility over busy thumbnails */}
            {subTagLabels.map((label) => (
              <span
                key={`lang-${label}`}
                className="rounded-full border border-cyan-300/40 bg-slate-950/85 px-2 py-0.5 text-[10px] font-medium text-cyan-200 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md"
              >
                {label}
              </span>
            ))}
            {/* Category chip — after languages */}
            {collection.category ? (
              <span className="rounded-full border border-white/20 bg-slate-950/85 px-2 py-0.5 text-[10px] font-medium text-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md">
                {collection.category.parentLabel
                  ? `${collection.category.parentLabel} › ${collection.category.label}`
                  : collection.category.label}
              </span>
            ) : null}
          </div>
          {disabledReason ? (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-300/30 bg-slate-950/78 px-3 py-2 text-xs font-semibold text-amber-100 shadow-[0_16px_34px_-24px_rgba(251,191,36,0.55)]">
              {disabledReason}
            </div>
          ) : null}
        </div>
        <div className="space-y-2.5 px-4 py-3">
          <div className="space-y-1">
            <p className="truncate text-[15px] font-semibold leading-6 text-[var(--mc-text)]">
              {collection.title}
            </p>
            <div className="flex min-w-0 items-center gap-2 text-[12px] leading-5 text-slate-300/88">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <StarRounded
                  sx={{
                    fontSize: 15,
                    color:
                      ratingCount > 0
                        ? "rgba(250, 204, 21, 0.95)"
                        : "rgba(148, 163, 184, 0.56)",
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
            <PlaylistAvailabilityWarningIcon
              playable={availabilityCounts.playable}
              total={availabilityCounts.total}
            />
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
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
      onKeyDown={handleCardKeyDown}
      className={`w-full cursor-pointer border-b border-slate-700/55 px-3 py-3 text-left transition ${
        disabled
          ? "cursor-not-allowed bg-slate-950/20 opacity-75"
          : selected
          ? "bg-cyan-500/10"
          : suppressCardHover
            ? "bg-transparent"
            : "hover:bg-cyan-500/[0.06]"
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
          {(subTagLabels.length > 0 || collection.category) && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {subTagLabels.map((label) => (
                <span
                  key={`list-lang-${label}`}
                  className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-100/90"
                >
                  {label}
                </span>
              ))}
              {collection.category && (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-slate-300/80">
                  {collection.category.parentLabel
                    ? `${collection.category.parentLabel} › ${collection.category.label}`
                    : collection.category.label}
                </span>
              )}
            </div>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--mc-text-muted)]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <StarRounded
                sx={{
                  fontSize: 14,
                  color:
                    ratingCount > 0
                      ? "rgba(250, 204, 21, 0.95)"
                      : "rgba(148, 163, 184, 0.56)",
                }}
              />
              <span className="shrink-0 font-semibold text-slate-100/90">
                {ratingAvgLabel}
              </span>
            </span>
            {ratingCountLabel ? (
              <span className="min-w-0 truncate text-slate-400">
                {ratingCountLabel}
              </span>
            ) : null}
            {disabledReason ? (
              <span className="min-w-0 truncate font-semibold text-amber-100">
                {disabledReason}
              </span>
            ) : null}
          </div>
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
        <PlaylistAvailabilityWarningIcon
          playable={availabilityCounts.playable}
          total={availabilityCounts.total}
        />
        {renderActions("list")}
      </div>
    </div>
  );
};

export default CollectionCard;
