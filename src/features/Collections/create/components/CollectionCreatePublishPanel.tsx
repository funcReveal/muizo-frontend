import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { Switch, TextField } from "@mui/material";
import {
  CategoryDrawerPanel,
  type CategoryDetectResult,
} from "@features/CollectionCategory";

type ChecklistTone = "success" | "warning" | "danger";

type Props = {
  title: string;
  onTitleChange: (value: string) => void;

  description: string;
  onDescriptionChange: (value: string) => void;

  visibility: "private" | "public";
  onVisibilityChange: (value: "private" | "public") => void;

  reachedPrivateCollectionLimit: boolean;
  reachedCollectionLimit: boolean;
  maxPrivateCollectionsPerUser: number;

  readyItems: number;
  longItems: number;
  skippedItems: number;
  removedDuplicateCount: number;

  isDraftOverflow: boolean;
  draftOverflowCount: number;
  isReadyToCreate: boolean;

  // Category
  detectSuggestion: CategoryDetectResult | null;
  detectIsRunning: boolean;
  detectHasRun: boolean;
  categoryId: string | null;
  onCategoryIdChange: (id: string | null) => void;
  subTagKeys: string[];
  onSubTagKeysChange: (keys: string[]) => void;
};

const ChecklistItem = ({
  tone,
  children,
}: {
  tone: ChecklistTone;
  children: ReactNode;
}) => {
  const icon =
    tone === "success" ? (
      <CheckCircleOutlineRounded sx={{ fontSize: 18 }} />
    ) : tone === "warning" ? (
      <WarningAmberRounded sx={{ fontSize: 18 }} />
    ) : (
      <ErrorOutlineRounded sx={{ fontSize: 18 }} />
    );

  const toneClass =
    tone === "success"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-rose-300/25 bg-rose-300/10 text-rose-100";

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${toneClass}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 leading-6">{children}</div>
    </div>
  );
};

const SummaryMetric = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) => {
  const valueClass =
    tone === "success"
      ? "text-emerald-100"
      : tone === "warning"
        ? "text-amber-100"
        : tone === "danger"
          ? "text-rose-100"
          : "text-[var(--mc-text)]";

  return (
    <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/35 p-3">
      <div className="text-xs text-[var(--mc-text-muted)]">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
};

export default function CollectionCreatePublishPanel({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  visibility,
  onVisibilityChange,
  reachedPrivateCollectionLimit,
  reachedCollectionLimit,
  maxPrivateCollectionsPerUser,
  readyItems,
  longItems,
  skippedItems,
  removedDuplicateCount,
  isDraftOverflow,
  draftOverflowCount,
  isReadyToCreate,
  detectSuggestion,
  detectIsRunning,
  detectHasRun,
  categoryId,
  onCategoryIdChange,
  subTagKeys,
  onSubTagKeysChange,
}: Props) {
  const { t } = useTranslation("collectionCreate");

  const trimmedTitle = title.trim();
  const hasTitle = trimmedTitle.length > 0;
  const hasPlayableItems = readyItems > 0;

  // Category is required for both private and public — backend enforces it
  const needsCategory = !categoryId;

  return (
    <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/65 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--mc-text)]">
            {t("publish.title")}
          </div>
          <div className="mt-1 text-sm leading-6 text-[var(--mc-text-muted)]">
            {t("publish.description")}
          </div>
        </div>

        <div
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            isReadyToCreate
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          {isReadyToCreate
            ? t("publish.readyBadge")
            : t("publish.attentionBadge")}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            {t("publish.details.title")}
          </div>

          <div className="mt-4">
            <TextField
              fullWidth
              size="small"
              label={t("publish.details.nameLabel")}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t("publish.details.namePlaceholder")}
              error={!hasTitle}
              helperText={!hasTitle ? t("publish.details.nameRequired") : " "}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              sx={{
                "& .MuiInputLabel-root": {
                  color: "rgba(248, 250, 252, 0.72)",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: !hasTitle
                    ? "rgba(251, 113, 133, 0.96)"
                    : "rgba(251, 191, 36, 0.96)",
                },
                "& .MuiFormHelperText-root": {
                  marginLeft: 0,
                  color: !hasTitle
                    ? "rgba(254, 202, 202, 0.95)"
                    : "rgba(148, 163, 184, 0.72)",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  color: "var(--mc-text)",
                  backgroundColor: "rgba(2, 6, 23, 0.32)",
                  "& fieldset": {
                    borderColor: !hasTitle
                      ? "rgba(248, 113, 113, 0.48)"
                      : "rgba(148, 163, 184, 0.24)",
                  },
                  "&:hover fieldset": {
                    borderColor: !hasTitle
                      ? "rgba(248, 113, 113, 0.66)"
                      : "rgba(34, 211, 238, 0.34)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: !hasTitle
                      ? "rgba(248, 113, 113, 0.72)"
                      : "rgba(251, 191, 36, 0.72)",
                  },
                },
              }}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              size="small"
              label={t("publish.details.descriptionLabel")}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder={t("publish.details.descriptionPlaceholder")}
              helperText={t("publish.details.descriptionCounter", {
                count: description.trim().length,
              })}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  maxLength: 500,
                },
              }}
              sx={{
                mt: 2,
                "& .MuiInputLabel-root": {
                  color: "rgba(248, 250, 252, 0.72)",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "rgba(251, 191, 36, 0.96)",
                },
                "& .MuiFormHelperText-root": {
                  marginLeft: 0,
                  color: "rgba(148, 163, 184, 0.72)",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  color: "var(--mc-text)",
                  backgroundColor: "rgba(2, 6, 23, 0.32)",
                  "& fieldset": {
                    borderColor: "rgba(148, 163, 184, 0.24)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(34, 211, 238, 0.34)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "rgba(251, 191, 36, 0.72)",
                  },
                },
                "& textarea::placeholder": {
                  color: "rgba(148, 163, 184, 0.72)",
                  opacity: 1,
                },
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            {t("publish.visibility.title")}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/45 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface)]/70 text-[var(--mc-accent)]">
                {visibility === "public" ? (
                  <PublicOutlined sx={{ fontSize: 19 }} />
                ) : (
                  <LockOutlined sx={{ fontSize: 19 }} />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--mc-text)]">
                  {visibility === "public"
                    ? t("publish.visibility.publicTitle")
                    : t("publish.visibility.privateTitle")}
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--mc-text-muted)]">
                  {visibility === "public"
                    ? t("publish.visibility.publicDescription")
                    : t("publish.visibility.privateDescription")}
                </div>
              </div>
            </div>

            <Switch
              checked={visibility === "public"}
              onChange={(_, checked) =>
                onVisibilityChange(checked ? "public" : "private")
              }
            />
          </div>

          {reachedPrivateCollectionLimit && visibility !== "public" && (
            <div className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              {t("publish.visibility.privateLimit", {
                count: maxPrivateCollectionsPerUser,
              })}
            </div>
          )}
        </div>

        {/* Category & Language — unified polished panel (same as edit drawer) */}
        <div className="overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30">
          <div className="border-b border-white/[0.06] px-4 py-3 text-sm font-semibold text-[var(--mc-text)]">
            分類設定
          </div>
          <CategoryDrawerPanel
            layout="embedded"
            categoryId={categoryId}
            subTagKeys={subTagKeys}
            visibility={visibility}
            isSaving={false}
            detectSuggestion={detectSuggestion}
            detectIsRunning={detectIsRunning}
            detectHasRun={detectHasRun}
            onCategoryChange={onCategoryIdChange}
            onSubTagsChange={onSubTagKeysChange}
          />
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            {t("publish.checklist.title")}
          </div>

          <div className="mt-3 space-y-2">
            <ChecklistItem tone={hasTitle ? "success" : "danger"}>
              {hasTitle
                ? t("publish.checklist.titleReady")
                : t("publish.checklist.titleMissing")}
            </ChecklistItem>

            <ChecklistItem tone={hasPlayableItems ? "success" : "danger"}>
              {hasPlayableItems
                ? t("publish.checklist.itemsReady", { count: readyItems })
                : t("publish.checklist.itemsMissing")}
            </ChecklistItem>

            <ChecklistItem tone={isDraftOverflow ? "danger" : "success"}>
              {isDraftOverflow
                ? t("publish.checklist.limitExceeded", {
                    count: draftOverflowCount,
                  })
                : t("publish.checklist.withinLimit")}
            </ChecklistItem>

            <ChecklistItem tone={reachedCollectionLimit ? "danger" : "success"}>
              {reachedCollectionLimit
                ? t("publish.checklist.quotaReached")
                : t("publish.checklist.quotaAvailable")}
            </ChecklistItem>

            {needsCategory && (
              <ChecklistItem tone="warning">
                公開收藏庫建議選擇分類，讓更多人找到你的內容
              </ChecklistItem>
            )}

            {skippedItems > 0 && (
              <ChecklistItem tone="warning">
                {t("publish.checklist.skippedWarning", {
                  count: skippedItems,
                })}
              </ChecklistItem>
            )}

            {longItems > 0 && (
              <ChecklistItem tone="warning">
                {t("publish.checklist.longWarning", {
                  count: longItems,
                })}
              </ChecklistItem>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            {t("publish.summary.title")}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <SummaryMetric
              label={t("publish.summary.ready")}
              value={readyItems}
              tone="success"
            />
            <SummaryMetric
              label={t("publish.summary.longTracks")}
              value={longItems}
              tone={longItems > 0 ? "warning" : "default"}
            />
            <SummaryMetric
              label={t("publish.summary.skipped")}
              value={skippedItems}
              tone={skippedItems > 0 ? "warning" : "default"}
            />
            <SummaryMetric
              label={t("publish.summary.duplicatesRemoved")}
              value={removedDuplicateCount}
              tone={removedDuplicateCount > 0 ? "success" : "default"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
