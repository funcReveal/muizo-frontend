import { useEffect, useMemo, useState } from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from "@mui/material";
import { AnimatePresence, motion } from "motion/react";

import type { PlaylistIssueSummary } from "../model/playlistPreviewIssues";

type PlaylistIssueTab =
  | "duplicate"
  | "removed"
  | "privateRestricted"
  | "embedBlocked"
  | "unavailable";

type PlaylistIssueGroup = {
  key: PlaylistIssueTab;
  label: string;
  count: number;
  items: string[];
  fallback?: string;
  className: string;
};

type PlaylistIssueSummaryDialogProps = {
  open: boolean;
  onClose: () => void;
  summary: PlaylistIssueSummary;
  total: number;
  title?: string;
  description?: string;
};

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const toLabels = (
  items: Array<{ title: string; reason: string }>,
  includeReason = false,
) =>
  items.map((item) =>
    includeReason ? `${item.title}：${item.reason}` : item.title,
  );

const buildIssueGroups = (
  summary: PlaylistIssueSummary,
): PlaylistIssueGroup[] => [
  {
    key: "duplicate",
    label: "重複略過",
    count: summary.duplicate.length,
    items: toLabels(summary.duplicate, true),
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  },
  {
    key: "removed",
    label: "已移除",
    count: summary.removed.length,
    items: toLabels(summary.removed),
    className: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  },
  {
    key: "privateRestricted",
    label: "隱私限制",
    count: summary.privateRestricted.length,
    items: toLabels(summary.privateRestricted, true),
    className: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
  },
  {
    key: "embedBlocked",
    label: "嵌入限制",
    count: summary.embedBlocked.length,
    items: toLabels(summary.embedBlocked, true),
    className: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  },
  {
    key: "unavailable",
    label: "其他不可用",
    count:
      summary.unavailable.length + summary.unknown.length + summary.unknownCount,
    items: [
      ...toLabels(summary.unavailable, true),
      ...toLabels(summary.unknown, true),
    ],
    fallback:
      summary.unknownCount > 0
        ? `共 ${summary.unknownCount} 首，後端未提供明細`
        : "無",
    className: "border-red-300/30 bg-red-300/10 text-red-100",
  },
];

const PlaylistIssueSummaryDialog = ({
  open,
  onClose,
  summary,
  total,
  title = "未成功匯入原因",
  description = `共 ${total} 首未能匯入`,
}: PlaylistIssueSummaryDialogProps) => {
  const groups = useMemo(() => buildIssueGroups(summary), [summary]);
  const [activeTab, setActiveTab] = useState<PlaylistIssueTab>(
    groups[0]?.key ?? "duplicate",
  );

  useEffect(() => {
    if (!open) return;
    const firstGroupWithItems = groups.find((group) => group.count > 0);
    setActiveTab(firstGroupWithItems?.key ?? groups[0]?.key ?? "duplicate");
  }, [groups, open]);

  const activeGroup =
    groups.find((group) => group.key === activeTab) ?? groups[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-start",
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid rgba(148, 163, 184, 0.22)",
          background:
            "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
          color: "var(--mc-text)",
          mt: { xs: 12, sm: 14 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
              {description}
            </div>
          </div>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="關閉未成功匯入原因"
            sx={{ color: "var(--mc-text-muted)" }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Tabs
          value={activeGroup.key}
          onChange={(_, value: PlaylistIssueTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
            "& .MuiTabs-indicator": {
              height: 2,
              borderRadius: 999,
              backgroundColor: "var(--mc-accent)",
            },
            "& .MuiTab-root": {
              minHeight: 36,
              px: 1.5,
              color: "var(--mc-text-muted)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
            },
            "& .Mui-selected": {
              color: "var(--mc-text)",
            },
          }}
        >
          {groups.map((group) => (
            <Tab
              key={group.key}
              value={group.key}
              label={`${group.label} ${group.count}`}
            />
          ))}
        </Tabs>

        <div className="min-h-[180px] pb-2 pt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeGroup.key}
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              style={{ originY: 0 }}
              transition={{
                layout: {
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                },
              }}
              className={`rounded-2xl border px-4 py-3 ${activeGroup.className}`}
            >
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{activeGroup.label}</span>
                <span>{activeGroup.count} 首</span>
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto pr-1">
                {activeGroup.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {activeGroup.items.map((item, index) => (
                      <div
                        key={`${activeGroup.key}-${item}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-[11px] font-semibold">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1 truncate text-xs leading-5">
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-3 text-xs opacity-90">
                    {activeGroup.fallback ?? "無"}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistIssueSummaryDialog;
