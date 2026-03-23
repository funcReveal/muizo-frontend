import type { RefObject } from "react";
import { InputAdornment, TextField } from "@mui/material";
import { SearchRounded, TuneRounded } from "@mui/icons-material";

type CreateLibraryTab = "public" | "personal" | "youtube";
type CreateLibraryView = "grid" | "list";
type PublicCollectionsSort = "favorites_first" | "popular" | "updated";

type LibrarySourceToolbarProps = {
  createLibraryTab: CreateLibraryTab;
  publicLibrarySearchPanelRef: RefObject<HTMLDivElement | null>;
  publicLibrarySearchActive: boolean;
  createLibrarySearch: string;
  setCreateLibrarySearch: (value: string) => void;
  collectionScope: "public" | "owner" | null;
  collectionsLoading: boolean;
  filteredCreateCollectionsLength: number;
  filteredCreateYoutubePlaylistsLength: number;
  createLibraryView: CreateLibraryView;
  setCreateLibraryView: (value: CreateLibraryView) => void;
  togglePublicLibrarySearch: () => void;
  publicCollectionsSort: PublicCollectionsSort;
  setPublicCollectionsSort: (value: PublicCollectionsSort) => void;
};

const LibrarySourceToolbar = ({
  createLibraryTab,
  publicLibrarySearchPanelRef,
  publicLibrarySearchActive,
  createLibrarySearch,
  setCreateLibrarySearch,
  collectionScope,
  collectionsLoading,
  filteredCreateCollectionsLength,
  filteredCreateYoutubePlaylistsLength,
  createLibraryView,
  setCreateLibraryView,
  togglePublicLibrarySearch,
  publicCollectionsSort,
  setPublicCollectionsSort,
}: LibrarySourceToolbarProps) => {
  if (createLibraryTab === "public") {
    return (
      <div
        ref={publicLibrarySearchPanelRef}
        className={`relative ${publicLibrarySearchActive ? "z-30" : "z-10"}`}
      >
        <div
          className={`relative flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
            publicLibrarySearchActive
              ? "border-cyan-300/30 bg-slate-950/20 shadow-[0_12px_30px_rgba(8,47,73,0.14)]"
              : "border-[var(--mc-border)]/80 bg-slate-950/18"
          }`}
        >
          <div className="min-w-0 flex-1">
            <TextField
              fullWidth
              size="small"
              value={createLibrarySearch}
              onChange={(event) => setCreateLibrarySearch(event.target.value)}
              placeholder="搜尋題庫名稱、封面曲名或描述"
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
                },
              }}
              sx={{
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
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-2">
              {collectionScope === "public" &&
              collectionsLoading &&
              filteredCreateCollectionsLength > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-2.5 py-1 text-[11px] text-cyan-100/88">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                  搜尋中
                </span>
              ) : null}
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-100/90">
                共 {filteredCreateCollectionsLength} 份題庫
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs ${
                    createLibraryView === "grid"
                      ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                      : "cursor-pointer text-[var(--mc-text-muted)]"
                  }`}
                  onClick={() => setCreateLibraryView("grid")}
                >
                  圖示
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs ${
                    createLibraryView === "list"
                      ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                      : "cursor-pointer text-[var(--mc-text-muted)]"
                  }`}
                  onClick={() => setCreateLibraryView("list")}
                >
                  清單
                </button>
              </div>
              <button
                type="button"
                aria-label="展開公開題庫排序選項"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                  publicLibrarySearchActive
                    ? "border-cyan-300/32 bg-cyan-500/14 text-cyan-100"
                    : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 text-[var(--mc-text-muted)] hover:text-slate-100"
                }`}
                onClick={togglePublicLibrarySearch}
              >
                <TuneRounded sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
          {publicLibrarySearchActive && (
            <div className="absolute left-3 right-3 top-full z-30 -mt-3 sm:left-4 sm:right-4">
              <div className="rounded-[0_0_22px_22px] border border-cyan-300/24 border-t-0 bg-slate-950 px-3 pb-3 pt-6 shadow-[0_24px_48px_rgba(2,6,23,0.48)] sm:px-4">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "favorites_first" as const, label: "推薦" },
                    { key: "popular" as const, label: "人氣遊玩" },
                    { key: "updated" as const, label: "最新題庫" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={publicCollectionsSort === option.key}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${
                        publicCollectionsSort === option.key
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--mc-border)]/80 bg-slate-950/18 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <TextField
          fullWidth
          size="small"
          value={createLibrarySearch}
          onChange={(event) => setCreateLibrarySearch(event.target.value)}
          placeholder={
            createLibraryTab === "youtube"
              ? "搜尋 YouTube 播放清單"
              : "搜尋題庫名稱、封面曲名或描述"
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
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "18px",
              backgroundColor: "rgba(2, 6, 23, 0.3)",
            },
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-100/90">
            {createLibraryTab === "youtube"
              ? `共 ${filteredCreateYoutubePlaylistsLength} 份清單`
              : `共 ${filteredCreateCollectionsLength} 份題庫`}
          </span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/60 p-1">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              createLibraryView === "grid"
                ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                : "cursor-pointer text-[var(--mc-text-muted)]"
            }`}
            onClick={() => setCreateLibraryView("grid")}
          >
            圖示
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              createLibraryView === "list"
                ? "cursor-pointer bg-cyan-500/20 text-cyan-100"
                : "cursor-pointer text-[var(--mc-text-muted)]"
            }`}
            onClick={() => setCreateLibraryView("list")}
          >
            清單
          </button>
        </div>
      </div>
    </div>
  );
};

export default LibrarySourceToolbar;
