import CollectionToolDrawer from "../../shared/components/CollectionToolDrawer";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import { Box, IconButton, Tab, Tabs } from "@mui/material";
import CreateHelp from "./CreateHelp";
import type {
  CollectionCreateSkippedItem,
  CollectionCreateSkippedItemStatus,
} from "../hooks/useCollectionCreateImportSources";

type PlaylistIssueTab =
  | "removed"
  | "private"
  | "blocked"
  | "unavailable"
  | "unknown";

type Props = {
  open: boolean;
  onClose: () => void;
  skippedItems: CollectionCreateSkippedItem[];
  skippedCount: number;
};

type IssueGroup = {
  key: PlaylistIssueTab;
  label: string;
  description: string;
  items: CollectionCreateSkippedItem[];
};

const normalizeStatus = (
  status: CollectionCreateSkippedItemStatus | undefined,
): PlaylistIssueTab => {
  if (status === "removed") return "removed";
  if (status === "private") return "private";
  if (status === "blocked") return "blocked";
  if (status === "unavailable") return "unavailable";
  return "unknown";
};

const getSourceTypeLabelKey = (
  sourceType: CollectionCreateSkippedItem["sourceType"],
) => {
  if (sourceType === "youtube_account_playlist") {
    return "issueDrawer.sourceTypeYoutubeAccount";
  }

  return "issueDrawer.sourceTypeYoutubeUrl";
};

export default function CollectionPlaylistIssueDrawer({
  open,
  onClose,
  skippedItems,
  skippedCount,
}: Props) {
  const { t } = useTranslation("collectionCreate");
  const [selectedTabOverride, setSelectedTabOverride] =
    useState<PlaylistIssueTab | null>(null);

  const groups = useMemo<IssueGroup[]>(() => {
    const grouped = skippedItems.reduce<
      Record<PlaylistIssueTab, CollectionCreateSkippedItem[]>
    >(
      (acc, item) => {
        if (item.status === "duplicate") {
          return acc;
        }

        acc[normalizeStatus(item.status)].push(item);
        return acc;
      },
      {
        removed: [],
        private: [],
        blocked: [],
        unavailable: [],
        unknown: [],
      },
    );

    const baseGroups: IssueGroup[] = [
      {
        key: "removed",
        label: t("issueDrawer.tabs.removed"),
        description: t("issueDrawer.descriptions.removed"),
        items: grouped.removed,
      },
      {
        key: "private",
        label: t("issueDrawer.tabs.private"),
        description: t("issueDrawer.descriptions.private"),
        items: grouped.private,
      },
      {
        key: "blocked",
        label: t("issueDrawer.tabs.blocked"),
        description: t("issueDrawer.descriptions.blocked"),
        items: grouped.blocked,
      },
      {
        key: "unavailable",
        label: t("issueDrawer.tabs.unavailable"),
        description: t("issueDrawer.descriptions.unavailable"),
        items: grouped.unavailable,
      },
    ];

    if (grouped.unknown.length === 0) {
      return baseGroups;
    }

    return [
      ...baseGroups,
      {
        key: "unknown",
        label: t("issueDrawer.tabs.unknown"),
        description: t("issueDrawer.descriptions.unknown"),
        items: grouped.unknown,
      },
    ];
  }, [skippedItems, t]);

  const defaultActiveTab = useMemo<PlaylistIssueTab>(() => {
    return groups.find((group) => group.items.length > 0)?.key ?? "removed";
  }, [groups]);

  const activeTab =
    selectedTabOverride &&
    groups.some((group) => group.key === selectedTabOverride)
      ? selectedTabOverride
      : defaultActiveTab;

  const activeGroup =
    groups.find((group) => group.key === activeTab) ?? groups[0];

  const duplicateSkippedCount = skippedItems.filter(
    (item) => item.status === "duplicate",
  ).length;

  const visibleSkippedItemCount = groups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  const unresolvedDetailCount = Math.max(
    0,
    skippedCount - visibleSkippedItemCount - duplicateSkippedCount,
  );

  const handleClose = () => {
    setSelectedTabOverride(null);
    onClose();
  };

  const getReasonLabel = (item: CollectionCreateSkippedItem) => {
    const normalizedStatus = normalizeStatus(item.status);

    if (normalizedStatus === "unknown" && item.reason?.trim()) {
      return t("issueDrawer.reasonLabels.unknownWithReason", {
        reason: item.reason.trim(),
      });
    }

    return t(`issueDrawer.reasonLabels.${normalizedStatus}`);
  };

  return (
    <CollectionToolDrawer
      open={open}
      onClose={handleClose}
      label="未匯入的歌曲"
      width={560}
      busy={false}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--mc-border)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-base font-semibold text-[var(--mc-text)]">
                <ErrorOutlineRounded sx={{ fontSize: 20 }} />
                {t("issueDrawer.title")}
              </div>

              <div className="mt-1 text-sm leading-6 text-[var(--mc-text-muted)]">
                {t("issueDrawer.description", {
                  count: skippedCount,
                })}
              </div>
            </div>

            <IconButton
              size="small"
              onClick={handleClose}
              aria-label={t("issueDrawer.close")}
              sx={{ color: "var(--mc-text-muted)" }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </div>

          {duplicateSkippedCount > 0 && (
            <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100">
              {t("issueDrawer.duplicateRedirectHint", {
                count: duplicateSkippedCount,
              })}
            </div>
          )}

          {unresolvedDetailCount > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
              {unresolvedDetailCount} 首歌曲未提供明細，請確認原始播放清單。
            </div>
          )}
        </div>

        {visibleSkippedItemCount > 0 && (
          <Box
            sx={{
              borderBottom: "1px solid var(--mc-border)",
              px: 2,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, nextValue: PlaylistIssueTab) => {
                setSelectedTabOverride(nextValue);
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 44,
                "& .MuiTab-root": {
                  minHeight: 44,
                  color: "var(--mc-text-muted)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "none",
                },
                "& .Mui-selected": {
                  color: "var(--mc-accent)",
                },
                "& .MuiTabs-indicator": {
                  height: 2,
                  borderRadius: 999,
                  backgroundColor: "var(--mc-accent)",
                },
              }}
            >
              {groups.map((group) => (
                <Tab
                  key={group.key}
                  value={group.key}
                  label={`${group.label} (${group.items.length})`}
                />
              ))}
            </Tabs>
          </Box>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {visibleSkippedItemCount > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--mc-text-muted)]">
              <span>
                {activeGroup.label} · {activeGroup.items.length} 首
              </span>
              <CreateHelp label="為什麼無法匯入？">
                {activeGroup.description}
              </CreateHelp>
            </div>
          )}

          {activeGroup.items.length > 0 ? (
            <div className="mt-3 space-y-2">
              {activeGroup.items.map((item) => (
                <div
                  key={item.skippedItemKey}
                  className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/55 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--mc-text)]">
                      {item.title?.trim() ||
                        item.videoId ||
                        t("issueDrawer.untitledItem")}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--mc-text-muted)]">
                      {item.videoId && (
                        <span>
                          {t("issueDrawer.videoId", {
                            videoId: item.videoId,
                          })}
                        </span>
                      )}

                      <span>
                        {t(getSourceTypeLabelKey(item.sourceType))}
                        {" · "}
                        {item.sourceTitle}
                      </span>
                    </div>

                    <div className="mt-2 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs leading-5 text-rose-100">
                      {getReasonLabel(item)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-4 py-8 text-sm text-[var(--mc-text-muted)]">
              {visibleSkippedItemCount > 0
                ? t("issueDrawer.emptyTab")
                : "沒有可顯示的歌曲明細"}
            </div>
          )}
        </div>
      </div>
    </CollectionToolDrawer>
  );
}
