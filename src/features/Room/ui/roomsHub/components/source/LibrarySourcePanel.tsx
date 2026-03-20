import type { ReactNode } from "react";
import { Button, Tooltip } from "@mui/material";
import {
  BookmarkBorderRounded,
  ChevronLeftRounded,
  LinkRounded,
  LockOutlined,
  PublicOutlined,
  YouTube,
} from "@mui/icons-material";

import type { PlaylistIssueSummary } from "./PlaylistPreviewRows";
import type { SourceSummary } from "../../roomsHubViewModels";

type CreateLibraryTab = "public" | "personal" | "youtube" | "link";
type CreateLeftTab = "library" | "settings";

type LibrarySourcePanelProps = {
  createLeftTab: CreateLeftTab;
  createLibraryTab: CreateLibraryTab;
  canUseGoogleLibraries: boolean;
  setCreateLibraryTab: (value: CreateLibraryTab) => void;
  handleBackToCreateLibrary: () => void;
  selectedSourceSummary: SourceSummary;
  createSourceHasImportIssues: boolean;
  playlistIssueSummary: PlaylistIssueSummary;
  setCreateLeftTab: (value: CreateLeftTab) => void;
  children: ReactNode;
};

const LibrarySourcePanel = ({
  createLeftTab,
  createLibraryTab,
  canUseGoogleLibraries,
  setCreateLibraryTab,
  handleBackToCreateLibrary,
  selectedSourceSummary,
  createSourceHasImportIssues,
  playlistIssueSummary,
  setCreateLeftTab,
  children,
}: LibrarySourcePanelProps) => {
  return (
    <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="p-2 sm:p-2">
        <div className=" flex items-center gap-3">
          <p className="text-lg font-semibold tracking-wider text-[var(--mc-text)]">
            {createLeftTab === "library" ? "題庫來源" : "房間設置"}
          </p>
        </div>

        {createLeftTab === "library" ? (
          <div className="mt-2 flex flex-col gap-2">
            {[
              {
                key: "public",
                label: "公開收藏庫",
                icon: <PublicOutlined fontSize="small" />,
              },
              {
                key: "personal",
                label: "個人收藏庫",
                icon: <BookmarkBorderRounded fontSize="small" />,
              },
              {
                key: "youtube",
                label: "從 YouTube 匯入",
                icon: <YouTube fontSize="small" />,
              },
              {
                key: "link",
                label: "貼上清單連結",
                icon: <LinkRounded fontSize="small" />,
              },
            ].map((item) => {
              const key = item.key as CreateLibraryTab;
              const isActive = createLibraryTab === key;
              const disabled =
                !canUseGoogleLibraries && key !== "public" && key !== "link";
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setCreateLibraryTab(key);
                  }}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                    disabled
                      ? "cursor-not-allowed bg-slate-900/40 text-slate-500"
                      : isActive
                        ? "cursor-pointer bg-cyan-500/10 text-cyan-100 shadow-[inset_3px_0_0_0_rgba(34,211,238,0.85)]"
                        : "cursor-pointer bg-[var(--mc-surface)]/35 text-[var(--mc-text)] hover:bg-cyan-500/10 hover:text-cyan-100"
                  }`}
                >
                  <span className="inline-flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-cyan-200/90">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {disabled && (
                      <Tooltip title="登入即可解鎖此功能" placement="top">
                        <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                      </Tooltip>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={handleBackToCreateLibrary}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-500/12"
            >
              <ChevronLeftRounded sx={{ fontSize: 16 }} />
              {"更換題庫來源"}
            </button>
            {selectedSourceSummary ? (
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/8 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/90">
                  {selectedSourceSummary.label}
                </p>
                <div className="mt-2 overflow-hidden rounded-lg">
                  {selectedSourceSummary.thumbnail ? (
                    <img
                      src={selectedSourceSummary.thumbnail}
                      alt={selectedSourceSummary.title}
                      className="h-28 w-full scale-[1.08] object-cover [object-position:center_35%]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center text-xs text-[var(--mc-text-muted)]">
                      {"無縮圖"}
                    </div>
                  )}
                </div>
                <div className="mt-2 min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--mc-text)]">
                    {selectedSourceSummary.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--mc-text-muted)]">
                    {selectedSourceSummary.detail}
                  </p>
                </div>
                {createSourceHasImportIssues && (
                  <div className="mt-3 grid gap-2">
                    <p className="text-[11px] font-semibold text-[var(--mc-text-muted)]">
                      {"未成功匯入原因"}
                    </p>
                    <div className="rounded-md border border-amber-300/35 bg-amber-300/10 px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-amber-100">
                        {"已移除："}{playlistIssueSummary.removed.length} {"首"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-amber-100/90">
                        {playlistIssueSummary.removed.length > 0
                          ? playlistIssueSummary.removed
                              .map((item) => item.title)
                              .join("、")
                          : "無"}
                      </p>
                    </div>
                    <div className="rounded-md border border-fuchsia-300/35 bg-fuchsia-300/10 px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-fuchsia-100">
                        {"隱私限制："}{playlistIssueSummary.privateRestricted.length} {"首"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-fuchsia-100/90">
                        {playlistIssueSummary.privateRestricted.length > 0
                          ? playlistIssueSummary.privateRestricted
                              .map((item) => item.title)
                              .join("、")
                          : "無"}
                      </p>
                    </div>
                    <div className="rounded-md border border-rose-300/35 bg-rose-300/10 px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-rose-100">
                        {"嵌入限制："}{playlistIssueSummary.embedBlocked.length} {"首"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-rose-100/90">
                        {playlistIssueSummary.embedBlocked.length > 0
                          ? playlistIssueSummary.embedBlocked
                              .map((item) => item.title)
                              .join("、")
                          : "無"}
                      </p>
                    </div>
                    <div className="rounded-md border border-red-300/35 bg-red-300/10 px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-red-100">
                        {"其他不可用："}
                        {playlistIssueSummary.unavailable.length +
                          playlistIssueSummary.unknown.length +
                          playlistIssueSummary.unknownCount}{" "}
                        {"首"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-red-100/90">
                        {playlistIssueSummary.unavailable.length > 0 ||
                        playlistIssueSummary.unknown.length > 0
                          ? [
                              ...playlistIssueSummary.unavailable.map(
                                (item) => item.title,
                              ),
                              ...playlistIssueSummary.unknown.map(
                                (item) => item.title,
                              ),
                            ].join("、")
                          : playlistIssueSummary.unknownCount > 0
                            ? `共 ${playlistIssueSummary.unknownCount} 首（後端未提供明細）`
                            : "無"}
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setCreateLeftTab("library")}
                  className="mt-2"
                >
                  {"重新選擇題庫"}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-cyan-300/30 bg-cyan-500/5 p-3 text-xs text-cyan-100/90">
                {"先在上方選擇題庫來源，載入歌曲後即可切換到房間設置。"}
              </div>
            )}
          </div>
        )}
      </aside>

      {children}
    </div>
  );
};

export default LibrarySourcePanel;
