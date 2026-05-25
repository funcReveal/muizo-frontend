import type { RefObject } from "react";
import {
  Box,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  GridViewRounded,
  LockOutlined,
  SearchRounded,
  TuneRounded,
  ViewAgendaRounded,
} from "@mui/icons-material";

import {
  type CreateLibraryTab,
  librarySourceItems,
} from "./librarySourceItems";

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
  filteredCreateCollectionsLength: number;
  createCollectionsTotalCount: number | null;
  filteredCreateYoutubePlaylistsLength: number;
  createLibraryView: CreateLibraryView;
  setCreateLibraryView: (value: CreateLibraryView) => void;
  togglePublicLibrarySearch: () => void;
  publicCollectionsSort: PublicCollectionsSort;
  setPublicCollectionsSort: (value: PublicCollectionsSort) => void;
  mobileEmbedded?: boolean;
  canUseGoogleLibraries?: boolean;
  setCreateLibraryTab?: (value: CreateLibraryTab) => void;
  onLockedSourceClick?: () => void;
  mobileSourceMeta?: string;
};

const publicSortOptions: Array<{
  key: Exclude<PublicCollectionsSort, "favorites_first">;
  label: string;
}> = [
  { key: "popular", label: "最受歡迎" },
  { key: "rating", label: "評分最高" },
  { key: "updated", label: "近期更新" },
];

const viewToggle = (
  createLibraryView: CreateLibraryView,
  setCreateLibraryView: (value: CreateLibraryView) => void,
) => (
  <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
    <button
      type="button"
      aria-label="圖示檢視"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
        createLibraryView === "grid"
          ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
          : "cursor-pointer text-[var(--mc-text-muted)]"
      }`}
      onClick={() => setCreateLibraryView("grid")}
    >
      <GridViewRounded sx={{ fontSize: 17 }} />
    </button>
    <button
      type="button"
      aria-label="清單檢視"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
        createLibraryView === "list"
          ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
          : "cursor-pointer text-[var(--mc-text-muted)]"
      }`}
      onClick={() => setCreateLibraryView("list")}
    >
      <ViewAgendaRounded sx={{ fontSize: 17 }} />
    </button>
  </div>
);

const searchFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "18px",
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    boxShadow: "none",
    "& fieldset": {
      borderColor: "rgba(148,163,184,0.18)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(34,211,238,0.32)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "rgba(34,211,238,0.48)",
    },
  },
} as const;

const LibrarySourceToolbar = ({
  createLibraryTab,
  publicLibrarySearchPanelRef,
  publicLibrarySearchActive,
  createLibrarySearch,
  setCreateLibrarySearch,
  collectionsLoading,
  filteredCreateCollectionsLength,
  createCollectionsTotalCount,
  filteredCreateYoutubePlaylistsLength,
  createLibraryView,
  setCreateLibraryView,
  togglePublicLibrarySearch,
  publicCollectionsSort,
  setPublicCollectionsSort,
  mobileEmbedded = false,
  canUseGoogleLibraries = false,
  setCreateLibraryTab,
  onLockedSourceClick,
  mobileSourceMeta,
}: LibrarySourceToolbarProps) => {
  const currentPublicSort =
    publicCollectionsSort === "favorites_first"
      ? "updated"
      : publicCollectionsSort;
  const publicCollectionCountLabel = collectionsLoading
    ? "載入中"
    : `共 ${createCollectionsTotalCount ?? filteredCreateCollectionsLength} 筆`;
  const collectionCountLabel =
    createLibraryTab === "youtube"
      ? `共 ${filteredCreateYoutubePlaylistsLength} 筆`
      : `共 ${createCollectionsTotalCount ?? filteredCreateCollectionsLength} 筆`;
  const selectedSource =
    librarySourceItems.find((item) => item.key === createLibraryTab) ??
    librarySourceItems[0];
  const showSearchToolbar = createLibraryTab !== "link";

  const handleMobileSelectChange = (
    event: SelectChangeEvent<CreateLibraryTab>,
  ) => {
    const nextValue = event.target.value as CreateLibraryTab;
    const isLocked =
      !canUseGoogleLibraries && nextValue !== "public" && nextValue !== "link";

    if (isLocked) {
      onLockedSourceClick?.();
      return;
    }

    setCreateLibraryTab?.(nextValue);
  };

  const mobileSourceSelect = mobileEmbedded ? (
    <FormControl fullWidth size="small">
      <Select<CreateLibraryTab>
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
            "linear-gradient(180deg, rgba(15,23,42,0.78), rgba(2,6,23,0.72))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 30px -24px rgba(14,165,233,0.55)",
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
            color: "rgba(186, 230, 253, 0.88)",
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              mt: 1,
              borderRadius: 2,
              border: "1px solid rgba(148,163,184,0.18)",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
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
                  onLockedSourceClick?.();
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
      {showSearchToolbar ? (
        <div
          className={`relative flex items-center gap-2 rounded-xl py-2 ${
            mobileEmbedded
              ? "border-[var(--mc-border)]/70 "
              : "border-transparent sm:justify-between sm:gap-3 sm:rounded-2xl sm:border sm:p-3"
          } ${
            publicLibrarySearchActive
              ? mobileEmbedded
                ? "border-cyan-300/30 bg-slate-950/54"
                : "bg-slate-950/10 sm:border-cyan-300/30 sm:bg-slate-950/20 sm:shadow-[0_12px_30px_rgba(8,47,73,0.14)]"
              : mobileEmbedded
                ? ""
                : "bg-transparent sm:border-[var(--mc-border)]/80 sm:bg-slate-950/18"
          }`}
        >
          <div className="relative min-w-0 flex-1">
            <TextField
              fullWidth
              size="small"
              value={createLibrarySearch}
              onChange={(event) => setCreateLibrarySearch(event.target.value)}
              placeholder={
                createLibraryTab === "youtube"
                  ? "搜尋 YouTube 播放清單名稱"
                  : "搜尋收藏庫名稱、曲目或建立者"
              }
              autoComplete="off"
              slotProps={{
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
                    createLibraryTab === "public" ? (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label="開啟收藏庫篩選"
                          onClick={togglePublicLibrarySearch}
                          sx={{
                            color: publicLibrarySearchActive
                              ? "rgba(186, 230, 253, 0.98)"
                              : "rgba(148, 163, 184, 0.86)",
                            backgroundColor: publicLibrarySearchActive
                              ? "rgba(34, 211, 238, 0.14)"
                              : "transparent",
                            border: publicLibrarySearchActive
                              ? "1px solid rgba(103, 232, 249, 0.28)"
                              : "1px solid transparent",
                            borderRadius: "10px",
                            "&:hover": {
                              backgroundColor: publicLibrarySearchActive
                                ? "rgba(34, 211, 238, 0.18)"
                                : "rgba(148, 163, 184, 0.08)",
                            },
                          }}
                        >
                          <TuneRounded sx={{ fontSize: 18 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                },
              }}
              sx={searchFieldSx}
            />
            {createLibraryTab === "public" && publicLibrarySearchActive && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2">
                <div className="rounded-[0_0_22px_22px] border border-cyan-300/24 border-t-0 bg-slate-950 px-3 pb-3 pt-4 shadow-[0_24px_48px_rgba(2,6,23,0.48)] sm:px-4">
                  <div className="flex flex-wrap items-center gap-2">
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
                            ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/32"
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
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:justify-end sm:gap-3">
            {!mobileEmbedded ? (
              <span
                className="inline-flex items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] font-normal text-cyan-100/90"
                aria-label={
                  createLibraryTab === "public"
                    ? publicCollectionCountLabel
                    : collectionCountLabel
                }
                title={
                  createLibraryTab === "public"
                    ? publicCollectionCountLabel
                    : collectionCountLabel
                }
              >
                {createLibraryTab === "public"
                  ? publicCollectionCountLabel
                  : collectionCountLabel}
              </span>
            ) : null}
            {viewToggle(createLibraryView, setCreateLibraryView)}
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
