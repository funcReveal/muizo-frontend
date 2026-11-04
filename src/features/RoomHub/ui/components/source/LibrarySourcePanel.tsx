import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import SiteTooltip from "@shared/ui/SiteTooltip";

import CreatePublicCollectionSourceAction from "./CreatePublicCollectionSourceAction";
import RoomsHubSocialLinks from "./RoomsHubSocialLinks";
import {
  type CreateLibraryTab,
  librarySourceItems,
} from "./librarySourceItems";
import "./sourceNavigation.css";

const sourceGroups: Array<{ label: string; keys: CreateLibraryTab[] }> = [
  { label: "收藏庫", keys: ["public", "personal"] },
  { label: "匯入歌曲", keys: ["youtube", "link"] },
];
type CreateLeftTab = "library" | "settings";

type LibrarySourcePanelProps = {
  createLeftTab: CreateLeftTab;
  createLibraryTab: CreateLibraryTab;
  canUseGoogleLibraries: boolean;
  setCreateLibraryTab: (value: CreateLibraryTab) => void;
  handleBackToCreateLibrary: () => void;
  onLockedSourceClick: (source: CreateLibraryTab) => void;
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
  const motionId = useId();
  const reduceMotion = useReducedMotion();
  const shouldShowDesktopCreatePublicCollectionAction =
    createLeftTab === "library" &&
    showCreatePublicCollectionAction &&
    Boolean(onCreatePublicCollection);

  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)] gap-0 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-none lg:gap-3">
      <aside className="hub-source-sidebar hidden min-w-0 lg:flex lg:self-stretch" aria-label="題庫來源側邊欄">
        {createLeftTab === "settings" ? <div>
            <button
              type="button"
              onClick={handleBackToCreateLibrary}
              className="hub-source-back"
              aria-label="返回題庫來源"
            >
              <ChevronLeftRounded sx={{ fontSize: 24 }} />
            </button>
        </div> : null}

        {createLeftTab === "settings" && sidebarContent ? (
          <div className="hidden lg:mt-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            {sidebarContent}
          </div>
        ) : null}

        {createLeftTab === "library" ? (
          <>
            <nav className="hub-source-nav" aria-label="選擇題庫來源">
              {sourceGroups.map((group) => <div className="hub-source-nav__group" key={group.label}>
                <p className="hub-source-nav__label">{group.label}</p>
                {librarySourceItems.filter((item) => group.keys.includes(item.key)).map((item) => {
                const isActive = createLibraryTab === item.key;
                const label = item.key === "youtube" ? "YouTube 播放清單" : item.label;
                const disabled =
                  !canUseGoogleLibraries &&
                  item.key !== "public" &&
                  item.key !== "link";

                return (
                  <SiteTooltip key={item.key} title={disabled ? (item.key === "youtube" ? "登入後連結 YouTube，直接選取你的播放清單。" : "登入後選取自己的私人題庫，建立遊戲房間。") : undefined} placement="right">
                  <button
                    key={item.key}
                    type="button"
                    aria-label={
                      disabled ? `${label}，登入後使用` : label
                    }
                    aria-pressed={isActive && !disabled}
                    data-active={isActive && !disabled}
                    data-locked={disabled}
                    onClick={() => {
                      if (disabled) {
                        onLockedSourceClick(item.key);
                        return;
                      }
                      setCreateLibraryTab(item.key);
                    }}
                    className="hub-source-nav__item"
                  >
                    {isActive && !disabled ? (
                      <motion.span
                        layoutId={`${motionId}-source-selection`}
                        className="hub-source-nav__selection"
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36, mass: 0.65 }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="hub-source-nav__icon" aria-hidden="true">{item.icon}</span>
                    <span className="hub-source-nav__text">{label}</span>
                      {disabled ? (
                        <LockOutlined className="hub-source-nav__status" aria-hidden="true" />
                      ) : null}
                  </button>
                  </SiteTooltip>
                );
                })}
              </div>)}
            </nav>

            {shouldShowDesktopCreatePublicCollectionAction ? (
              <div className="hub-source-sidebar__footer">
                <CreatePublicCollectionSourceAction
                  onClick={onCreatePublicCollection!}
                />
                <RoomsHubSocialLinks />
              </div>
            ) : null}
          </>
        ) : null}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
};

export default LibrarySourcePanel;
