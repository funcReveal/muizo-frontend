import type { ReactNode } from "react";

import { Tooltip } from "@mui/material";
import {
  BookmarkBorderRounded,
  ChevronLeftRounded,
  LinkRounded,
  LockOutlined,
  PublicOutlined,
  YouTube,
} from "@mui/icons-material";

type CreateLibraryTab = "public" | "personal" | "youtube" | "link";
type CreateLeftTab = "library" | "settings";

type LibrarySourcePanelProps = {
  createLeftTab: CreateLeftTab;
  createLibraryTab: CreateLibraryTab;
  canUseGoogleLibraries: boolean;
  setCreateLibraryTab: (value: CreateLibraryTab) => void;
  handleBackToCreateLibrary: () => void;
  children: ReactNode;
};

const LibrarySourcePanel = ({
  createLeftTab,
  createLibraryTab,
  canUseGoogleLibraries,
  setCreateLibraryTab,
  handleBackToCreateLibrary,
  children,
}: LibrarySourcePanelProps) => {
  return (
    <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="pr-2 pb-2 pl-0 pt-2 sm:p-2">
        <div className="flex items-center gap-1">
          {createLeftTab === "settings" ? (
            <Tooltip title="更換題庫來源" placement="top">
              <button
                type="button"
                onClick={handleBackToCreateLibrary}
                className="inline-flex h-10 w-10 items-center justify-center text-cyan-100 transition hover:text-cyan-200"
                aria-label="更換題庫來源"
              >
                <ChevronLeftRounded sx={{ fontSize: 24 }} />
              </button>
            </Tooltip>
          ) : null}
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
                    {disabled ? (
                      <Tooltip title="使用此來源前需要先登入 Google" placement="top">
                        <LockOutlined sx={{ fontSize: 14, color: "#fbbf24" }} />
                      </Tooltip>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </aside>

      {children}
    </div>
  );
};

export default LibrarySourcePanel;
