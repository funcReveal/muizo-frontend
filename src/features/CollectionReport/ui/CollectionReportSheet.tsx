import { useMemo, useState } from "react";
import { Button, Drawer } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import FlagRounded from "@mui/icons-material/FlagRounded";

import { useCollectionReport } from "../model/useCollectionReport";
import { CollectionReportApiError } from "../model/collectionReportApi";
import {
  COLLECTION_REPORT_TYPE_OPTIONS,
  type CollectionReport,
  type CollectionReportType,
  type CollectionReportValue,
} from "../model/types";

const DESCRIPTION_MAX_LENGTH = 500;

// CollectionDetailDrawer 的 z-index 為 1500，本 sheet 必須蓋在其上。
const SHEET_Z_INDEX = 1600;

type CollectionReportSheetProps = {
  collectionId: string;
  open: boolean;
  onClose: () => void;
};

const resolveSubmitErrorMessage = (error: unknown): string => {
  if (error instanceof CollectionReportApiError) {
    switch (error.code) {
      case "RATE_LIMITED":
        return "檢舉太頻繁，請稍後再試";
      case "SELF_REPORT_FORBIDDEN":
        return "無法檢舉自己的收藏庫";
      case "REPORT_SUBMIT_CONFLICT":
        return "檢舉已送出，請重新整理後查看";
      case "UNAUTHORIZED":
        return "請先登入後再檢舉";
      default:
        return error.message || "送出檢舉失敗，請稍後再試";
    }
  }
  return "送出檢舉失敗，請稍後再試";
};

type ReportSheetBodyProps = {
  myReport: CollectionReport | null;
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (value: CollectionReportValue) => Promise<unknown>;
  onClose: () => void;
};

// State lives in a keyed child so opening the sheet (or my-report changing)
// remounts it with fresh initial values — no sync-setState effects needed.
const ReportSheetBody = ({
  myReport,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ReportSheetBodyProps) => {
  // pending = editing the open report (prefilled);
  // reviewed/dismissed = filing a NEW report (blank form).
  const isEditingPending = myReport?.status === "pending";
  const isReReport = Boolean(myReport && !isEditingPending);

  const [selectedType, setSelectedType] = useState<CollectionReportType | null>(
    isEditingPending ? myReport!.reportType : null,
  );
  const [description, setDescription] = useState(
    isEditingPending ? (myReport!.description ?? "") : "",
  );
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(selectedType) && !isSubmitting,
    [selectedType, isSubmitting],
  );

  const handleSubmit = async () => {
    if (!selectedType || !canSubmit) return;

    try {
      await onSubmit({
        reportType: selectedType,
        description: description.trim() || null,
      });
      setSubmitted(true);
    } catch {
      // submitError 由 mutation state 呈現
    }
  };

  return (
    <>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
        {submitted ? (
          <div className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            已送出檢舉，感謝你的回報。管理員會盡快審核。
          </div>
        ) : (
          <>
            {isReReport ? (
              <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                你先前的檢舉已由管理員審核完成。如問題仍然存在，可再次提出檢舉。
              </div>
            ) : isEditingPending ? (
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/8 px-4 py-3 text-xs text-cyan-100">
                你已檢舉過此收藏庫，可在審核前修改檢舉內容。
              </div>
            ) : null}

            <fieldset
              className="flex flex-col gap-2"
              disabled={isSubmitting}
            >
              <legend className="mb-1 text-xs font-semibold text-slate-400">
                檢舉原因
              </legend>
              {COLLECTION_REPORT_TYPE_OPTIONS.map((option) => {
                const isSelected = selectedType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedType(option.value)}
                    disabled={isSubmitting}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-rose-300/40 bg-rose-400/12 shadow-[0_12px_28px_-22px_rgba(251,113,133,0.9)]"
                        : "border-white/10 bg-white/[0.03] hover:border-rose-200/25 hover:bg-rose-400/8"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? "text-rose-100" : "text-slate-100"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="collection-report-description"
                className="text-xs font-semibold text-slate-400"
              >
                補充說明（選填）
              </label>
              <textarea
                id="collection-report-description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value.slice(0, DESCRIPTION_MAX_LENGTH),
                  )
                }
                disabled={isSubmitting}
                rows={3}
                placeholder="請描述問題，協助管理員更快處理"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-200/35 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="self-end text-[11px] text-slate-500">
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-2.5 text-xs text-rose-100">
                {resolveSubmitErrorMessage(submitError)}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/8 px-5 py-3.5">
        <Button
          size="small"
          onClick={onClose}
          className="!rounded-full !px-4 !text-xs !font-semibold !normal-case !text-slate-300 hover:!bg-white/[0.06]"
        >
          {submitted ? "關閉" : "取消"}
        </Button>
        {!submitted ? (
          <Button
            size="small"
            variant="contained"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="!rounded-full !bg-rose-400/85 !px-4 !text-xs !font-bold !normal-case !text-slate-950 hover:!bg-rose-300 disabled:!bg-white/10 disabled:!text-slate-500"
          >
            {isSubmitting
              ? "送出中…"
              : isEditingPending
                ? "更新檢舉"
                : "送出檢舉"}
          </Button>
        ) : null}
      </div>
    </>
  );
};

export const CollectionReportSheet = ({
  collectionId,
  open,
  onClose,
}: CollectionReportSheetProps) => {
  const { myReport, isLoading, submitReport, isSubmitting, submitError } =
    useCollectionReport({ collectionId, enabled: open });

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{ zIndex: SHEET_Z_INDEX }}
      slotProps={{
        paper: {
          sx: {
            width: "min(440px, calc(100vw - 24px))",
            marginInline: "auto",
            maxHeight: "min(82dvh, 640px)",
            borderRadius: "20px 20px 0 0",
            border: "1px solid rgba(103,232,249,0.16)",
            borderBottom: 0,
            background:
              "linear-gradient(180deg, rgba(8,15,28,0.99), rgba(2,6,23,0.99))",
            color: "var(--mc-text)",
            boxShadow: "0 -24px 70px rgba(2,6,23,0.72)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-2">
          <FlagRounded sx={{ fontSize: 19 }} className="text-rose-300" />
          <h2 className="text-sm font-bold text-slate-100">
            {myReport?.status === "pending" ? "檢舉內容" : "檢舉此收藏庫"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
        >
          <CloseRounded sx={{ fontSize: 18 }} />
        </button>
      </div>

      {/* Body mounts once per open session AFTER my-report resolves, so its
          initial state is final — later myReport updates (e.g. successful
          submit) never remount it and the success message survives. */}
      {open && !isLoading ? (
        <ReportSheetBody
          key={collectionId}
          myReport={myReport}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onSubmit={submitReport}
          onClose={onClose}
        />
      ) : open ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          載入中…
        </div>
      ) : null}
    </Drawer>
  );
};
