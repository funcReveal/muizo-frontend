import CloseRounded from "@mui/icons-material/CloseRounded";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";

import type { RemovedDuplicateGroup } from "../utils/createCollectionImport";

type Props = {
  open: boolean;
  onClose: () => void;
  removedDuplicateCount: number;
  removedDuplicateGroups: RemovedDuplicateGroup[];
};

export default function CollectionDuplicateDialog({
  open,
  onClose,
  removedDuplicateCount,
  removedDuplicateGroups,
}: Props) {
  const { t } = useTranslation("collectionCreate");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid rgba(148, 163, 184, 0.22)",
          background:
            "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(2,6,23,0.98))",
          color: "var(--mc-text)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">
              {t("dialogs.duplicateTitle")}
            </div>
            <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
              {t("dialogs.duplicateDescription", {
                count: removedDuplicateCount,
              })}
            </div>
          </div>

          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t("dialogs.closeDuplicateDialog")}
            sx={{ color: "var(--mc-text-muted)" }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent>
        <div className="space-y-3">
          {removedDuplicateGroups.map((group) => (
            <div
              key={group.key}
              className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-3 py-3"
            >
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                {group.title}
              </div>

              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                {group.uploader || t("dialogs.duplicateUnknownUploader")}
              </div>

              <div className="mt-2 text-xs text-emerald-100">
                {t("dialogs.duplicateOccurrenceSummary", {
                  totalCount: group.totalCount,
                  keptIndex: group.keptIndex + 1,
                  removedCount: group.removedCount,
                })}
              </div>

              <div className="mt-1 text-[11px] text-emerald-200">
                {t("dialogs.duplicateRemovedPositions", {
                  positions: group.removedIndexes
                    .map((index) => index + 1)
                    .join("、"),
                })}
              </div>

              {group.url && (
                <a
                  href={group.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-[11px] text-cyan-200 underline decoration-cyan-300/40 underline-offset-4 transition hover:text-cyan-100"
                >
                  {group.url}
                </a>
              )}
            </div>
          ))}

          {removedDuplicateGroups.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/25 px-4 py-8 text-sm text-[var(--mc-text-muted)]">
              {t("dialogs.duplicateEmpty")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
