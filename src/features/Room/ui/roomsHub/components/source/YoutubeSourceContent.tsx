import { Button } from "@mui/material";
import { PlayCircleOutlineRounded, SearchRounded } from "@mui/icons-material";
import { List } from "react-window";
import type { ReactNode } from "react";

import LibraryEmptyState from "./LibraryEmptyState";
import type {
  VirtualLibraryListRowComponent,
  VirtualLibraryListRowProps,
} from "./VirtualLibraryListRow";

type YoutubeSourceContentProps = {
  youtubePlaylistsLoading: boolean;
  createLibraryView: "grid" | "list";
  filteredCreateYoutubePlaylists: unknown[];
  normalizedCreateLibrarySearch: string;
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

const YoutubeSourceContent = ({
  youtubePlaylistsLoading,
  createLibraryView,
  filteredCreateYoutubePlaylists,
  normalizedCreateLibrarySearch,
  handleActivateLinkSource,
  setCreateLibraryTab,
  createLibraryColumns,
  youtubeListRowHeight,
  renderYoutubeSkeletonCard,
  renderYoutubeCard,
  VirtualLibraryListRow,
}: YoutubeSourceContentProps) => {
  if (youtubePlaylistsLoading) {
    return (
      <div className="flex h-full min-h-full flex-1 flex-col rounded-xl border border-transparent bg-transparent p-0 sm:border-[var(--mc-border)]/70 sm:bg-slate-950/18 sm:p-2">
        {createLibraryView === "grid" ? (
          <div className="h-full min-h-0 overflow-y-auto sm:pr-1">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) =>
                renderYoutubeSkeletonCard(idx, "grid"),
              )}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-0 space-y-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, idx) =>
              renderYoutubeSkeletonCard(idx, "list"),
            )}
          </div>
        )}
      </div>
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
                onClick={handleActivateLinkSource}
              >
                改用貼上連結
              </Button>
              <Button
                size="small"
                variant="text"
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
        <div className="h-full min-h-0 overflow-y-auto sm:pr-1">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${createLibraryColumns}, minmax(0, 1fr))`,
            }}
          >
            {filteredCreateYoutubePlaylists.map((playlist, index) =>
              renderYoutubeCard(playlist, index, "grid"),
            )}
          </div>
        </div>
      ) : (
        <List<VirtualLibraryListRowProps>
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
