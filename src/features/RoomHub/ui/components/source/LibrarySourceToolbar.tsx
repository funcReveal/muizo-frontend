import { useId, type RefObject } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  Box,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  GridViewRounded,
  CloseRounded,
  LockOutlined,
  SearchRounded,
  TuneRounded,
  ViewAgendaRounded,
} from "@mui/icons-material";

import {
  type CreateLibraryTab,
  librarySourceItems,
} from "./librarySourceItems";
import "./libraryToolbar.css";
import AnimatedSearchHint from "./AnimatedSearchHint";
import LibraryFiltersDrawer from "./LibraryFiltersDrawer";
import { useInitialCollectionCount } from "../../hooks/useInitialCollectionCount";
import { selectMenuPlacement, useSelectMenuAnchor } from "@shared/ui/select/selectMenuPlacement";

type CreateLibraryView = "grid" | "list";
type PublicCollectionsSort =
  | "favorites_first"
  | "popular"
  | "updated"
  | "rating";

type LibrarySourceToolbarProps = {
  createLibraryTab: CreateLibraryTab;
  publicLibrarySearchPanelRef: RefObject<HTMLDivElement | null>;
  publicLibrarySearchActive: boolean;
  createLibrarySearch: string;
  setCreateLibrarySearch: (value: string) => void;
  collectionsLoading: boolean;
  youtubePlaylistsLoading?: boolean;
  filteredCreateCollectionsLength: number;
  createCollectionsTotalCount: number | null;
  filteredCreateYoutubePlaylistsLength: number;
  createLibraryView: CreateLibraryView;
  setCreateLibraryView: (value: CreateLibraryView) => void;
  togglePublicLibrarySearch: () => void;
  closePublicLibrarySearch?: () => void;
  onResetFilters?: () => void;
  publicCollectionsSort: PublicCollectionsSort;
  setPublicCollectionsSort: (value: PublicCollectionsSort) => void;
  /** Optional filter content rendered inside the search panel (below sort options) */
  filterContent?: React.ReactNode;
  /** Number of active filters — shown as a small badge on the filter button */
  activeFilterCount?: number;
  mobileEmbedded?: boolean;
  canUseGoogleLibraries?: boolean;
  setCreateLibraryTab?: (value: CreateLibraryTab) => void;
  onLockedSourceClick?: (source: CreateLibraryTab) => void;
  mobileSourceMeta?: string;
};

const publicSortOptions: Array<{
  key: Exclude<PublicCollectionsSort, "favorites_first">;
  label: string;
}> = [
  { key: "rating", label: "推薦排序" },
  { key: "popular", label: "最受歡迎" },
  { key: "updated", label: "近期更新" },
];

const LibraryViewToggle = ({ view, onChange }: {
  view: CreateLibraryView;
  onChange: (value: CreateLibraryView) => void;
}) => {
  const layoutId = useId();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.65 };
  return (
    <LayoutGroup id={layoutId}>
      <div className="hub-library-view-control" role="group" aria-label="顯示方式">
        {(["grid", "list"] as const).map((value) => {
          const selected = view === value;
          return (
            <motion.button
              key={value}
              type="button"
              aria-label={value === "grid" ? "圖示檢視" : "清單檢視"}
              aria-pressed={selected}
              className="hub-library-view-control__button"
              onClick={() => onChange(value)}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              transition={transition}
            >
              {selected && <motion.span className="hub-library-view-control__selection" layoutId="selection" initial={false} transition={transition} style={{ borderRadius: 9 }} />}
              <motion.span className="hub-library-view-control__icon" initial={false} animate={{ scale: selected ? 1 : 0.94 }} transition={transition}>
                {value === "grid" ? <GridViewRounded sx={{ fontSize: 17 }} /> : <ViewAgendaRounded sx={{ fontSize: 17 }} />}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
};

const searchFieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 44,
    borderRadius: "12px",
    backgroundColor: "var(--mc-surface-strong)",
    boxShadow: "inset 0 1px 0 rgb(245 245 243 / 0.06), 0 1px 2px rgb(0 0 0 / 0.16)",
    transition: "background-color 180ms ease, box-shadow 180ms ease",
    "& fieldset": {
      border: "none",
    },
    "&:hover fieldset": {
      border: "none",
    },
    "&.Mui-focused": {
      outline: "2px solid var(--mc-accent)",
      outlineOffset: "-2px",
    },
    "&.Mui-focused fieldset": {
      border: "none",
    },
  },
  "& input": { fontSize: 14, paddingBlock: "11px", color: "var(--mc-text)" },
  "& input::placeholder": { color: "transparent", opacity: 0 },
  "& .MuiIconButton-root": { width: 36, height: 36 },
} as const;

const LibrarySourceToolbar = ({
  createLibraryTab,
  publicLibrarySearchPanelRef,
  publicLibrarySearchActive,
  createLibrarySearch,
  setCreateLibrarySearch,
  collectionsLoading,
  youtubePlaylistsLoading = false,
  filteredCreateCollectionsLength,
  createCollectionsTotalCount,
  filteredCreateYoutubePlaylistsLength,
  createLibraryView,
  setCreateLibraryView,
  togglePublicLibrarySearch,
  closePublicLibrarySearch,
  onResetFilters,
  publicCollectionsSort,
  setPublicCollectionsSort,
  filterContent,
  activeFilterCount = 0,
  mobileEmbedded = false,
  canUseGoogleLibraries = false,
  setCreateLibraryTab,
  onLockedSourceClick,
  mobileSourceMeta,
}: LibrarySourceToolbarProps) => {
  const isMobileViewport = useMediaQuery("(max-width: 1023.95px)");
  const { anchorRef, menuWidth } = useSelectMenuAnchor();
  const currentPublicSort =
    publicCollectionsSort === "favorites_first"
      ? "updated"
      : publicCollectionsSort;
  const countPending = createLibraryTab === "youtube"
    ? youtubePlaylistsLoading && filteredCreateYoutubePlaylistsLength === 0
    : collectionsLoading && createCollectionsTotalCount === null && filteredCreateCollectionsLength === 0;
  const targetCount = countPending ? null : createLibraryTab === "youtube"
    ? filteredCreateYoutubePlaylistsLength
    : createCollectionsTotalCount ?? filteredCreateCollectionsLength;
  const displayedCount = useInitialCollectionCount(createLibraryTab, targetCount);
  const collectionCountLabel = `共 ${displayedCount.toLocaleString("zh-TW")} 筆${countPending ? " · 載入中" : ""}`;
  const selectedSource =
    librarySourceItems.find((item) => item.key === createLibraryTab) ??
    librarySourceItems[0];
  const showSearchToolbar = createLibraryTab !== "link";
  const searchHint = `${createLibraryTab === "youtube" ? "搜尋播放清單" : "搜尋題庫"} · ${collectionCountLabel}`;

  const handleMobileSelectChange = (
    event: SelectChangeEvent<CreateLibraryTab>,
  ) => {
    const nextValue = event.target.value as CreateLibraryTab;
    const isLocked =
      !canUseGoogleLibraries && nextValue !== "public" && nextValue !== "link";

    if (isLocked) {
      onLockedSourceClick?.(nextValue);
      return;
    }

    setCreateLibraryTab?.(nextValue);
  };

  const mobileSourceSelect = mobileEmbedded ? (
    <FormControl ref={anchorRef} fullWidth size="small">
      <Select<CreateLibraryTab>
        autoWidth
        value={createLibraryTab}
        onChange={handleMobileSelectChange}
        displayEmpty
        renderValue={() => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                flex: "0 0 auto",
              }}
            >
              {selectedSource.icon}
            </Box>
            <Box
              sx={{
                minWidth: 0,
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "#e2e8f0",
                  fontWeight: 700,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {selectedSource.label}
              </Typography>
              {mobileSourceMeta ? (
                <Box
                  component="span"
                  sx={{
                    flex: "0 0 auto",
                    px: 1,
                    py: 0.25,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {mobileSourceMeta}
                </Box>
              ) : null}
            </Box>
          </Box>
        )}
        sx={{
          borderRadius: "16px",
          color: "#e2e8f0",
          background:
            "var(--mc-surface)",
          boxShadow:
            "none",
          "& .MuiSelect-select": {
            px: 1.25,
            py: 0.75,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148, 163, 184, 0.2)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148, 163, 184, 0.2)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148, 163, 184, 0.2)",
          },
          "& .MuiSelect-icon": {
            color: "var(--mc-text-muted)",
          },
        }}
        MenuProps={{
          ...selectMenuPlacement,
          PaperProps: {
            style: { width: menuWidth, maxWidth: "100vw" },
            sx: {
              mt: 1,
              borderRadius: 2,
              border: "1px solid rgba(148,163,184,0.18)",
              background:
                "var(--mc-surface-strong)",
              boxShadow:
                "0 22px 40px rgba(2,6,23,0.48), 0 0 0 1px rgba(34,211,238,0.06)",
              backdropFilter: "blur(14px)",
            },
          },
          MenuListProps: {
            dense: true,
            sx: { py: 0.5 },
          },
        }}
        inputProps={{ "aria-label": "題庫來源" }}
      >
        {librarySourceItems.map((item) => {
          const disabled =
            !canUseGoogleLibraries &&
            item.key !== "public" &&
            item.key !== "link";

          return (
            <MenuItem
              key={item.key}
              value={item.key}
              onClick={() => {
                if (disabled) {
                  onLockedSourceClick?.(item.key);
                }
              }}
              sx={{
                gap: 1.25,
                py: 1.2,
                px: 1.5,
                minHeight: 0,
                opacity: disabled ? 0.72 : 1,
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "10px",
                  color: disabled ? "rgba(148,163,184,0.54)" : "",
                  background: disabled ? "rgba(51, 65, 85, 0.3)" : "",
                  border: disabled ? "1px solid rgba(148,163,184,0.12)" : "",
                  flex: "0 0 auto",
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: disabled ? "rgba(148,163,184,0.7)" : "#e2e8f0",
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
              {disabled ? (
                <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
              ) : null}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  ) : null;

  const toolbarContent = (
    <>
      {mobileSourceSelect}
      {mobileEmbedded && isMobileViewport && <LibraryFiltersDrawer
        open={createLibraryTab === "public" && publicLibrarySearchActive}
        onClose={closePublicLibrarySearch ?? togglePublicLibrarySearch}
        onReset={onResetFilters}
        resultCount={targetCount}
        loading={collectionsLoading}
      >
        <div className="library-filters-sort" role="group" aria-label="排序">
          <h3>排序</h3>
          {publicSortOptions.map((option) => <button key={option.key} type="button" aria-pressed={currentPublicSort === option.key} onClick={() => setPublicCollectionsSort(option.key)}>{option.label}</button>)}
        </div>
        {filterContent}
      </LibraryFiltersDrawer>}

      {showSearchToolbar ? (
        <div
          className={`relative flex items-center gap-2 rounded-xl py-2 ${
            mobileEmbedded
              ? "border-[var(--mc-border)]/70 "
              : "sm:justify-between sm:gap-3 sm:p-3"
          } ${
            publicLibrarySearchActive
              ? mobileEmbedded
                ? "bg-stone-900/50"
                : "bg-transparent"
              : mobileEmbedded
                ? ""
                : "bg-transparent"
          }`}
        >
          <div className="relative min-w-0 flex-1">
            <TextField
              className="hub-library-search-field"
              fullWidth
              size="small"
              value={createLibrarySearch}
              onChange={(event) => setCreateLibrarySearch(event.target.value)}
              placeholder={searchHint}
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === "Escape" && createLibrarySearch) {
                  event.preventDefault();
                  setCreateLibrarySearch("");
                }
              }}
              slotProps={{
                htmlInput: { "aria-label": createLibraryTab === "youtube" ? "搜尋 YouTube 播放清單" : "搜尋收藏庫" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded
                        sx={{
                          fontSize: 18,
                          color: "rgba(148, 163, 184, 0.85)",
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment:
                    (createLibrarySearch || createLibraryTab === "public") ? (
                      <InputAdornment position="end">
                        {createLibrarySearch ? (
                          <IconButton aria-label="清除搜尋" title="清除搜尋（Esc）" size="small" onClick={() => setCreateLibrarySearch("")} sx={{ color: "var(--mc-text-muted)" }}>
                            <CloseRounded sx={{ fontSize: 17 }} />
                          </IconButton>
                        ) : null}
                        {createLibraryTab === "public" ? <IconButton
                          edge="end"
                          size="small"
                          aria-label="開啟收藏庫篩選"
                          aria-expanded={publicLibrarySearchActive}
                          aria-haspopup={mobileEmbedded ? "dialog" : undefined}
                          onClick={togglePublicLibrarySearch}
                          sx={{
                            position: "relative",
                            color: publicLibrarySearchActive
                              ? "var(--mc-accent)"
                              : "rgba(148, 163, 184, 0.86)",
                            backgroundColor: publicLibrarySearchActive
                              ? "var(--mc-accent-soft)"
                              : "transparent",
                            border: publicLibrarySearchActive
                              ? "1px solid var(--mc-accent-border)"
                              : "1px solid transparent",
                            borderRadius: "10px",
                            "&:hover": {
                              backgroundColor: publicLibrarySearchActive
                                ? "var(--mc-accent-soft)"
                                : "rgba(148, 163, 184, 0.08)",
                            },
                          }}
                        >
                          <TuneRounded sx={{ fontSize: 18 }} />
                          {activeFilterCount > 0 && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-slate-950 shadow"
                            >
                              {activeFilterCount}
                            </span>
                          )}
                        </IconButton> : null}
                      </InputAdornment>
                    ) : undefined,
                },
              }}
              sx={searchFieldSx}
            />
            <AnimatedSearchHint text={searchHint} transitionKey={createLibraryTab} hidden={Boolean(createLibrarySearch)} />
            {!mobileEmbedded && createLibraryTab === "public" && publicLibrarySearchActive && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2">
                <div className="rounded-2xl bg-[var(--mc-surface-strong)] px-3 pb-3 pt-4 shadow-[0_12px_36px_rgb(0_0_0/0.35),inset_0_1px_rgb(245_245_243/0.08)] sm:px-4">
                  {/* Sort options */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      排序
                    </span>
                    {publicSortOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={currentPublicSort === option.key}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${
                          currentPublicSort === option.key
                            ? "bg-[var(--mc-accent-soft)] text-[var(--mc-accent)] ring-1 ring-amber-300/32"
                            : "bg-slate-900 text-[var(--mc-text-muted)] ring-1 ring-white/10 hover:bg-slate-800 hover:text-slate-100"
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPublicCollectionsSort(option.key);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {/* Filter content slot — appears below sort */}
                  {filterContent && (
                    <div
                      className="mt-3 border-t border-white/[0.06] pt-3"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {filterContent}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:justify-end sm:gap-3">
            <LibraryViewToggle view={createLibraryView} onChange={setCreateLibraryView} />
          </div>
        </div>
      ) : null}
    </>
  );

  if (mobileEmbedded) {
    return (
      <div
        ref={createLibraryTab === "public" ? publicLibrarySearchPanelRef : null}
        className="bg-[var(--mc-bg)]"
      >
        {toolbarContent}
      </div>
    );
  }

  return (
    <div
      ref={createLibraryTab === "public" ? publicLibrarySearchPanelRef : null}
      className={`relative ${publicLibrarySearchActive ? "z-30" : "z-10"}`}
    >
      {toolbarContent}
    </div>
  );
};

export default LibrarySourceToolbar;
