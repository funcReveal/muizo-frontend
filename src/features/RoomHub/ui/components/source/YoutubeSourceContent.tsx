import { Button } from "@mui/material";
import {
  PlayCircleOutlineRounded,
  SearchRounded,
  YouTube,
} from "@mui/icons-material";
import { List } from "react-window";
import type { ReactNode } from "react";

import LibraryEmptyState from "./LibraryEmptyState";
import type {
  VirtualLibraryListRowComponent,
  VirtualLibraryListRowProps,
} from "./VirtualLibraryListRow";
import VirtualLibraryGridRow, {
  type VirtualLibraryGridRowProps,
} from "./VirtualLibraryGridRow";

type YoutubeSourceContentProps = {
  youtubePlaylistsLoading: boolean;
  createLibraryView: "grid" | "list";
  filteredCreateYoutubePlaylists: unknown[];
  normalizedCreateLibrarySearch: string;
  hasYoutubeAuthorization: boolean;
  onLinkGoogleYouTube: () => void;
  handleActivateLinkSource: () => void;
  setCreateLibraryTab: (value: "public") => void;
  createLibraryColumns: number;
  youtubeListRowHeight: number;
  renderYoutubeSkeletonCard: (idx: number, view: "grid" | "list") => ReactNode;
  renderYoutubeCard: (
    item: unknown,
    itemIndex: number,
    view: "grid" | "list",
  ) => ReactNode;
  VirtualLibraryListRow: VirtualLibraryListRowComponent;
};

const primaryActionSx = {
  borderRadius: "999px",
  px: 2,
  py: 0.8,
  fontWeight: 700,
  color: "rgb(8, 15, 28)",
  background:
    "linear-gradient(135deg, rgba(103,232,249,0.96), rgba(45,212,191,0.9))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.36), 0 16px 30px -22px rgba(34,211,238,0.9)",
  "&:hover": {
    background:
      "linear-gradient(135deg, rgba(125,245,255,0.98), rgba(94,234,212,0.94))",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.4), 0 18px 34px -22px rgba(34,211,238,0.95)",
  },
} as const;

const secondaryActionSx = {
  borderRadius: "999px",
  px: 2,
  py: 0.8,
  fontWeight: 700,
  color: "rgb(186, 230, 253)",
  borderColor: "rgba(125, 211, 252, 0.28)",
  backgroundColor: "rgba(15, 23, 42, 0.46)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)",
  "&:hover": {
    borderColor: "rgba(125, 211, 252, 0.46)",
    backgroundColor: "rgba(14, 165, 233, 0.12)",
  },
} as const;

const YoutubeSourceContent = ({
  youtubePlaylistsLoading,
  createLibraryView,
  filteredCreateYoutubePlaylists,
  normalizedCreateLibrarySearch,
  hasYoutubeAuthorization,
  onLinkGoogleYouTube,
  handleActivateLinkSource,
  setCreateLibraryTab,
  createLibraryColumns,
  youtubeListRowHeight,
  renderYoutubeSkeletonCard,
  renderYoutubeCard,
  VirtualLibraryListRow,
}: YoutubeSourceContentProps) => {
  const gridRowCount = Math.ceil(
    filteredCreateYoutubePlaylists.length / createLibraryColumns,
  );
  const gridRowHeight = 276;
  const gridMinCardWidth = 260;

  if (youtubePlaylistsLoading) {
    return (
      <div className="flex h-full min-h-full flex-1 flex-col rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
        {createLibraryView === "grid" ? (
          <div className="h-auto lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(${gridMinCardWidth}px, 1fr))`,
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) =>
                renderYoutubeSkeletonCard(idx, "grid"),
              )}
            </div>
          </div>
        ) : (
          <div className="h-auto space-y-2 lg:h-full lg:min-h-0 lg:overflow-hidden">
            {Array.from({ length: 4 }).map((_, idx) =>
              renderYoutubeSkeletonCard(idx, "list"),
            )}
          </div>
        )}
      </div>
    );
  }

  if (!hasYoutubeAuthorization) {
    return (
      <LibraryEmptyState
        icon={<YouTube sx={{ fontSize: 30 }} />}
        title="連結 YouTube 後即可匯入清單"
        description="授權後可直接選取帳號播放清單建立房間；公開播放清單可改用貼上連結。"
        actions={
          <>
            <Button
              size="small"
              variant="contained"
              sx={primaryActionSx}
              onClick={onLinkGoogleYouTube}
            >
              連結 Google / YouTube
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={secondaryActionSx}
              onClick={handleActivateLinkSource}
            >
              改用貼上連結
            </Button>
          </>
        }
      />
    );
  }

  if (filteredCreateYoutubePlaylists.length === 0) {
    return (
      <LibraryEmptyState
        icon={
          normalizedCreateLibrarySearch ? (
            <SearchRounded sx={{ fontSize: 28 }} />
          ) : (
            <PlayCircleOutlineRounded sx={{ fontSize: 28 }} />
          )
        }
        title={
          normalizedCreateLibrarySearch
            ? "找不到符合的播放清單"
            : "目前還沒有可用的 YouTube 清單"
        }
        description={
          normalizedCreateLibrarySearch
            ? "試試不同關鍵字，或清除搜尋後重新瀏覽你的 YouTube 播放清單。"
            : "你可以先貼上播放清單連結，或改用公開/個人題庫建立房間。"
        }
        actions={
          normalizedCreateLibrarySearch ? undefined : (
            <>
              <Button
                size="small"
                variant="outlined"
                sx={secondaryActionSx}
                onClick={handleActivateLinkSource}
              >
                改用貼上連結
              </Button>
              <Button
                size="small"
                variant="text"
                sx={{
                  borderRadius: "999px",
                  px: 1.5,
                  fontWeight: 700,
                  color: "rgba(186, 230, 253, 0.88)",
                  "&:hover": {
                    backgroundColor: "rgba(14, 165, 233, 0.1)",
                  },
                }}
                onClick={() => setCreateLibraryTab("public")}
              >
                瀏覽公開題庫
              </Button>
            </>
          )
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-full flex-1 flex-col rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
      {createLibraryView === "grid" ? (
        <List<VirtualLibraryGridRowProps>
          key="youtube-grid"
          style={{ height: "100%", width: "100%" }}
          rowCount={gridRowCount}
          rowHeight={gridRowHeight}
          rowProps={{
            items: filteredCreateYoutubePlaylists,
            columns: createLibraryColumns,
            minCardWidth: gridMinCardWidth,
            renderItem: renderYoutubeCard,
          }}
          rowComponent={VirtualLibraryGridRow}
          overscanCount={2}
        />
      ) : (
        <List<VirtualLibraryListRowProps>
          key="youtube-list"
          style={{ height: "100%", width: "100%" }}
          rowCount={filteredCreateYoutubePlaylists.length}
          rowHeight={youtubeListRowHeight}
          rowProps={{
            items: filteredCreateYoutubePlaylists,
            renderItem: renderYoutubeCard,
          }}
          rowComponent={VirtualLibraryListRow as never}
        />
      )}
    </div>
  );
};

export default YoutubeSourceContent;
