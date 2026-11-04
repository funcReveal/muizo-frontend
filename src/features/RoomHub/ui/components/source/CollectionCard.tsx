import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowForwardRounded,
  BarChartRounded,
  CheckRounded,
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
} from "@features/RoomSession/model/playlistAvailability";
import { CollectionMetaChips } from "@features/CollectionCategory";
import "./collectionCard.css";

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
  backgroundColor: "#211d17",
  color: "var(--mc-text)",
  borderRadius: "14px",
  minWidth: 150,
  boxShadow: "0 20px 40px rgba(0,0,0,0.46)",
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
  const statsMeta = [
    itemCountLabel
      ? {
          key: "questions",
          icon: (
            <QuizRounded
              sx={{ fontSize: 16, color: "var(--mc-accent)" }}
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
              sx={{ fontSize: 16, color: "var(--mc-text-muted)" }}
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
    if (event.target !== event.currentTarget) return;
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
        <span className="hidden sm:inline-flex">
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
            className={`hub-collection-card__action hub-collection-card__action--${placement}`}
          >
            <MoreHorizRounded fontSize="small" />
          </IconButton>
        </span>
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
        aria-pressed={selected}
        data-selected={selected}
        data-disabled={disabled}
        data-action-active={suppressCardHover}
        onClick={() => {
          if (disabled) return;
          onSelect();
        }}
        onKeyDown={handleCardKeyDown}
        className="hub-collection-card hub-collection-card--grid relative h-full overflow-hidden text-left"
      >
        <div className="hub-collection-card__cover relative h-36 w-full overflow-hidden">
          {previewThumbnail ? (
            <img
              src={previewThumbnail}
              alt={collection.cover_title ?? collection.title}
              className="hub-collection-card__image h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-[var(--mc-text-muted)]">
              無封面
            </div>
          )}
          <div className="hub-collection-card__shade pointer-events-none absolute inset-0" />
          {selected ? <span className="hub-collection-card__selected"><CheckRounded />已選用</span> : null}
          {!disabled && !disabledReason ? <span className="hub-collection-card__preview" aria-hidden="true">查看題庫<ArrowForwardRounded /></span> : null}
          <div className="absolute inset-x-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-start gap-1.5">
            {!isPublicLibraryTab ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-stone-950/70 px-2.5 py-1 text-[11px] font-medium text-stone-100 backdrop-blur-sm">
                {isPublic ? (
                  <PublicOutlined sx={{ fontSize: 13 }} />
                ) : (
                  <LockOutlined sx={{ fontSize: 13 }} />
                )}
                {visibilityLabel}
              </span>
            ) : null}
            <CollectionMetaChips
              collection={collection}
              maxVisible={3}
              variant="overlay" className="hub-collection-card__tags"
            />
          </div>
          {disabledReason ? (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-300/30 bg-stone-950/90 px-3 py-2 text-xs font-semibold text-amber-100 shadow-[0_16px_34px_-24px_rgba(251,191,36,0.55)]">
              {disabledReason}
            </div>
          ) : null}
        </div>
        <div className="hub-collection-card__body space-y-2.5 px-4 py-3">
          <div className="space-y-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="hub-collection-card__title min-w-0 flex-1 truncate text-[15px] font-semibold leading-6 text-[var(--mc-text)]" title={collection.title}>
                {collection.title}
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-[12px] leading-5 text-stone-300/90">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <StarRounded
                  sx={{
                    fontSize: 15,
                    color:
                      ratingCount > 0
                        ? "rgba(250, 204, 21, 0.95)"
                        : "rgba(168, 162, 150, 0.7)",
                  }}
                />
                <span className="shrink-0 font-semibold text-stone-100/95">
                  {ratingAvgLabel}
                </span>
              </span>
              {ratingCountLabel ? (
                <span className="min-w-0 truncate text-stone-400">
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
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-none text-[var(--mc-text-muted)]"
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
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={selected}
      data-selected={selected}
      data-disabled={disabled}
      data-action-active={suppressCardHover}
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
      onKeyDown={handleCardKeyDown}
      className="hub-collection-card hub-collection-card--list w-full px-3 py-3 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="hub-collection-card__cover h-11 w-16 shrink-0 overflow-hidden rounded-md">
          {previewThumbnail ? (
            <img
              src={previewThumbnail}
              alt={collection.cover_title ?? collection.title}
              className="hub-collection-card__image h-full w-full object-cover"
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
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <p className="min-w-[3rem] truncate text-[13px] font-semibold text-[var(--mc-text)] sm:text-sm">
                {collection.title}
              </p>
              <CollectionMetaChips collection={collection} toneFilter="category" className="hub-collection-card__tags" />
              <CollectionMetaChips collection={collection} toneFilter="language" lowPriority className="hub-collection-card__tags" />
            </div>
            {!isPublicLibraryTab ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] leading-none text-stone-200/90">
                {isPublic ? (
                  <PublicOutlined sx={{ fontSize: 12 }} />
                ) : (
                  <LockOutlined sx={{ fontSize: 12 }} />
                )}
                {visibilityLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--mc-text-muted)]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <StarRounded
                sx={{
                  fontSize: 14,
                  color:
                    ratingCount > 0
                      ? "rgba(250, 204, 21, 0.95)"
                      : "rgba(168, 162, 150, 0.7)",
                }}
              />
              <span className="shrink-0 font-semibold text-stone-100/90">
                {ratingAvgLabel}
              </span>
            </span>
            {ratingCountLabel ? (
              <span className="min-w-0 truncate text-stone-400">
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
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-none text-stone-200/90"
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
