import { useState, type MouseEvent } from "react";
import { Popover } from "@mui/material";
import ReportGmailerrorredRounded from "@mui/icons-material/ReportGmailerrorredRounded";
import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";

import { useAuth } from "@shared/auth/AuthContext";
import {
  collectionModerationApi,
  CollectionModerationApiError,
} from "../model/collectionModerationApi";

type ModerationStatus = "normal" | "action_required" | "under_review";

type ModerationChipProps = {
  collectionId: string;
  moderationStatus: ModerationStatus | undefined;
  moderationReason: string | null | undefined;
  /** Server-derived: the owner edited the collection after the flag/reject. */
  canRequestReview: boolean;
  /** Called after a successful resubmit so the parent can update local state. */
  onResubmitted: () => void;
  /** sm = collection card chip row, md = edit page header row. */
  size?: "sm" | "md";
};

/**
 * Compact owner-facing moderation indicator: a pill with a pulsing danger
 * dot that opens a popover with the takedown reason and the resubmit
 * action. Occupies a single chip slot — never pushes the layout around.
 * Renders nothing for normal collections.
 */
const ModerationChip = ({
  collectionId,
  moderationStatus,
  moderationReason,
  canRequestReview,
  onResubmitted,
  size = "md",
}: ModerationChipProps) => {
  const { authToken, refreshAuthToken } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    moderationStatus !== "action_required" &&
    moderationStatus !== "under_review"
  ) {
    return null;
  }

  const isTakedown = moderationStatus === "action_required";
  const open = Boolean(anchorEl);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setError(null);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    if (submitting) return;
    setAnchorEl(null);
  };

  const handleRequestReview = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await collectionModerationApi.requestReview({
        collectionId,
        authToken,
        refreshAuthToken,
      });
      setAnchorEl(null);
      onResubmitted();
    } catch (err) {
      if (err instanceof CollectionModerationApiError && err.status === 429) {
        setError("送審次數過於頻繁，請稍後再試。");
      } else if (
        err instanceof CollectionModerationApiError &&
        err.code === "REVIEW_REQUEST_NOT_EDITED"
      ) {
        setError("請先依原因修改收藏庫內容，再送出審核。");
      } else if (
        err instanceof CollectionModerationApiError &&
        err.status === 409
      ) {
        // State already moved on (e.g. another tab resubmitted) — sync up.
        setAnchorEl(null);
        onResubmitted();
      } else {
        setError(err instanceof Error ? err.message : "送出審核失敗");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const chipSizeClasses =
    size === "sm"
      ? "gap-1 px-2 py-0.5 text-[10px]"
      : "gap-1.5 px-2.5 py-1 text-xs";
  const chipToneClasses = isTakedown
    ? "border-red-400/55 bg-red-950/80 text-red-200 hover:border-red-300/80 hover:bg-red-900/80"
    : "border-amber-400/50 bg-amber-950/75 text-amber-200 hover:border-amber-300/75 hover:bg-amber-900/75";

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label={isTakedown ? "待處理：收藏庫需要調整，點擊查看詳情" : "審核中"}
        className={`inline-flex shrink-0 items-center rounded-full border font-medium shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md transition-colors ${chipSizeClasses} ${chipToneClasses}`}
      >
        <span className="relative inline-flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
              isTakedown ? "bg-red-400" : "bg-amber-400"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isTakedown ? "bg-red-400" : "bg-amber-400"
            }`}
          />
        </span>
        <span>{isTakedown ? "待處理" : "審核中"}</span>
      </button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
              overflow: "visible",
              mt: 1,
            },
          },
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`w-[300px] max-w-[88vw] rounded-2xl border bg-[var(--mc-surface)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ${
            isTakedown ? "border-red-500/45" : "border-amber-500/40"
          }`}
        >
          {isTakedown ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
                <ReportGmailerrorredRounded sx={{ fontSize: 18 }} />
                收藏庫需要調整
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--mc-text-muted)]">
                為符合平台規範，這個收藏庫暫時不會出現在公開收藏庫中。
              </p>
              {moderationReason ? (
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-xs leading-relaxed text-[var(--mc-text)]">
                  {moderationReason}
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-[var(--mc-text-muted)]">
                {canRequestReview
                  ? "調整完成後請送出審核，通過後即會恢復公開。"
                  : "請依原因調整內容，完成編輯後即可送出審核。"}
              </p>
              {error ? (
                <p className="mt-2 text-xs text-red-400">{error}</p>
              ) : null}
              <button
                type="button"
                disabled={submitting || !canRequestReview}
                onClick={() => void handleRequestReview()}
                className="mt-3 w-full rounded-full border border-red-400/60 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:border-red-300 hover:bg-red-500/35 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting
                  ? "送出中…"
                  : canRequestReview
                    ? "我已調整完成，送出審核"
                    : "請先調整內容後再送審"}
              </button>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                <HourglassTopRounded sx={{ fontSize: 18 }} />
                審核中
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--mc-text-muted)]">
                你已送出審核，收藏庫暫時不會出現在公開收藏庫。管理員批准後將自動恢復公開。
              </p>
            </>
          )}
        </div>
      </Popover>
    </>
  );
};

export default ModerationChip;
