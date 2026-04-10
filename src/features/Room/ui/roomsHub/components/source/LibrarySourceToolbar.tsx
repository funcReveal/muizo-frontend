import type { RefObject } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import {
  GridViewRounded,
  SearchRounded,
  TuneRounded,
  ViewAgendaRounded,
} from "@mui/icons-material";

type CreateLibraryTab = "public" | "personal" | "youtube";
type CreateLibraryView = "grid" | "list";
type PublicCollectionsSort = "favorites_first" | "popular" | "updated";

type LibrarySourceToolbarProps = {
  createLibraryTab: CreateLibraryTab;
  publicLibrarySearchPanelRef: RefObject<HTMLDivElement | null>;
  publicLibrarySearchActive: boolean;
  createLibrarySearch: string;
  setCreateLibrarySearch: (value: string) => void;
  collectionsLoading: boolean;
  filteredCreateCollectionsLength: number;
  filteredCreateYoutubePlaylistsLength: number;
  createLibraryView: CreateLibraryView;
  setCreateLibraryView: (value: CreateLibraryView) => void;
  togglePublicLibrarySearch: () => void;
  publicCollectionsSort: PublicCollectionsSort;
  setPublicCollectionsSort: (value: PublicCollectionsSort) => void;
};

const publicSortOptions: Array<{
  key: Exclude<PublicCollectionsSort, "favorites_first">;
  label: string;
}> = [
  { key: "popular", label: "最多收藏" },
  { key: "updated", label: "最近更新" },
];

const viewToggle = (
  createLibraryView: CreateLibraryView,
  setCreateLibraryView: (value: CreateLibraryView) => void,
) => (
  <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
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
  filteredCreateYoutubePlaylistsLength,
  createLibraryView,
  setCreateLibraryView,
  togglePublicLibrarySearch,
  publicCollectionsSort,
  setPublicCollectionsSort,
}: LibrarySourceToolbarProps) => {
  const currentPublicSort =
    publicCollectionsSort === "favorites_first"
      ? "updated"
      : publicCollectionsSort;

  if (createLibraryTab === "public") {
    return (
      <div
        ref={publicLibrarySearchPanelRef}
        className={`relative ${publicLibrarySearchActive ? "z-30" : "z-10"}`}
      >
        <div
          className={`relative flex flex-col gap-2 rounded-xl border border-transparent px-0 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-2xl sm:border sm:p-3 ${
            publicLibrarySearchActive
              ? "bg-slate-950/10 sm:border-cyan-300/30 sm:bg-slate-950/20 sm:shadow-[0_12px_30px_rgba(8,47,73,0.14)]"
              : "bg-transparent sm:border-[var(--mc-border)]/80 sm:bg-slate-950/18"
          }`}
        >
          <div className="relative min-w-0 flex-1">
            <TextField
              fullWidth
              size="small"
              value={createLibrarySearch}
              onChange={(event) => setCreateLibrarySearch(event.target.value)}
              placeholder="搜尋收藏庫名稱、曲目或建立者"
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
                  endAdornment: (
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
                  ),
                },
              }}
              sx={searchFieldSx}
            />
            {publicLibrarySearchActive && (
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
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-100/90">
              {collectionsLoading
                ? "載入中"
                : `共 ${filteredCreateCollectionsLength} 筆`}
            </span>
            {viewToggle(createLibraryView, setCreateLibraryView)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-transparent bg-transparent px-0 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-2xl sm:border-[var(--mc-border)]/80 sm:bg-slate-950/18 sm:p-3">
      <div className="min-w-0 flex-1">
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
            },
          }}
          sx={searchFieldSx}
        />
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-100/90">
          {createLibraryTab === "youtube"
            ? `共 ${filteredCreateYoutubePlaylistsLength} 筆`
            : `共 ${filteredCreateCollectionsLength} 筆`}
        </span>
        {viewToggle(createLibraryView, setCreateLibraryView)}
      </div>
    </div>
  );
};

export default LibrarySourceToolbar;
