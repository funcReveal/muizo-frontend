import type { ReactNode } from "react";

import { Tooltip } from "@mui/material";
import { ChevronLeftRounded, LockOutlined } from "@mui/icons-material";

import CreatePublicCollectionSourceAction from "./CreatePublicCollectionSourceAction";
import {
  type CreateLibraryTab,
  librarySourceItems,
} from "./librarySourceItems";
type CreateLeftTab = "library" | "settings";

type LibrarySourcePanelProps = {
  createLeftTab: CreateLeftTab;
  createLibraryTab: CreateLibraryTab;
  canUseGoogleLibraries: boolean;
  setCreateLibraryTab: (value: CreateLibraryTab) => void;
  handleBackToCreateLibrary: () => void;
  onLockedSourceClick: () => void;
  sidebarContent?: ReactNode;
  children: ReactNode;
  showCreatePublicCollectionAction?: boolean;
  onCreatePublicCollection?: () => void;
};

const LibrarySourcePanel = ({
  createLeftTab,
  createLibraryTab,
  canUseGoogleLibraries,
  setCreateLibraryTab,
  handleBackToCreateLibrary,
  onLockedSourceClick,
  sidebarContent,
  children,
  showCreatePublicCollectionAction = false,
  onCreatePublicCollection,
}: LibrarySourcePanelProps) => {
  const shouldShowDesktopCreatePublicCollectionAction =
    createLeftTab === "library" &&
    showCreatePublicCollectionAction &&
    Boolean(onCreatePublicCollection);

  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2 lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-none lg:gap-3">
      <aside className="min-w-0 self-start px-0 lg:py-1 lg:flex lg:min-h-0 lg:self-stretch lg:flex-col lg:pr-2 lg:pb-2 lg:pl-0 lg:pt-2">
        <div className="mb-2 hidden items-center gap-1 lg:mb-0 lg:flex">
          {createLeftTab === "settings" ? (
            <button
              type="button"
              onClick={handleBackToCreateLibrary}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-cyan-100 transition hover:text-cyan-200"
              aria-label="返回題庫來源"
            >
              <ChevronLeftRounded sx={{ fontSize: 24 }} />
            </button>
          ) : null}
          <p className="text-base font-semibold tracking-[0.18em] text-[var(--mc-text)] sm:text-lg">
            {createLeftTab === "library" ? "題庫來源" : "房間設定"}
          </p>
        </div>

        {createLeftTab === "settings" && sidebarContent ? (
          <div className="hidden lg:mt-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            {sidebarContent}
          </div>
        ) : null}

        {createLeftTab === "library" ? (
          <>
            <div className="mt-2 hidden flex-col gap-2 lg:flex">
              {librarySourceItems.map((item) => {
                const isActive = createLibraryTab === item.key;
                const disabled =
                  !canUseGoogleLibraries &&
                  item.key !== "public" &&
                  item.key !== "link";

                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        onLockedSourceClick();
                        return;
                      }
                      setCreateLibraryTab(item.key);
                    }}
                    className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                      disabled
                        ? "cursor-pointer bg-slate-900/40 text-slate-400 hover:bg-slate-900/55 hover:text-slate-200"
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
                        <Tooltip title="點擊即可登入後使用" placement="top">
                          <LockOutlined
                            sx={{ fontSize: 14, color: "#fbbf24" }}
                          />
                        </Tooltip>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {shouldShowDesktopCreatePublicCollectionAction ? (
              <div className="mt-auto hidden pt-3 lg:block">
                <CreatePublicCollectionSourceAction
                  isAuthenticated={canUseGoogleLibraries}
                  onClick={onCreatePublicCollection!}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
};

export default LibrarySourcePanel;
