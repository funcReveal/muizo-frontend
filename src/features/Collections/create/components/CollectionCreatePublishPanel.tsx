import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { Switch, TextField } from "@mui/material";

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
};

const ChecklistItem = ({
  tone,
  children,
}: {
  tone: ChecklistTone;
  children: React.ReactNode;
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
}: Props) {
  const trimmedTitle = title.trim();
  const hasTitle = trimmedTitle.length > 0;
  const hasPlayableItems = readyItems > 0;

  return (
    <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/65 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--mc-text)]">
            Publish Collection
          </div>
          <div className="mt-1 text-sm leading-6 text-[var(--mc-text-muted)]">
            Confirm the final settings before creating this playable collection.
          </div>
        </div>

        <div
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            isReadyToCreate
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          {isReadyToCreate ? "Ready to create" : "Needs attention"}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            Collection details
          </div>

          <div className="mt-4">
            <TextField
              fullWidth
              size="small"
              label="Collection name"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Enter collection name"
              error={!hasTitle}
              helperText={!hasTitle ? "Collection name is required." : " "}
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
              label="Description"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Describe what this collection is about, who it is for, or what kind of songs it contains."
              helperText={`${description.trim().length}/500`}
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
            Visibility
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
                    ? "Public collection"
                    : "Private collection"}
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--mc-text-muted)]">
                  {visibility === "public"
                    ? "Other players can browse and use this collection."
                    : "Only you can view and use this collection."}
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
              私人收藏最多只能建立 {maxPrivateCollectionsPerUser} 個。
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            Readiness checklist
          </div>

          <div className="mt-3 space-y-2">
            <ChecklistItem tone={hasTitle ? "success" : "danger"}>
              {hasTitle
                ? "Collection name is set."
                : "Collection name is required before creating."}
            </ChecklistItem>

            <ChecklistItem tone={hasPlayableItems ? "success" : "danger"}>
              {hasPlayableItems
                ? `${readyItems} playable items are ready.`
                : "At least one playable item is required."}
            </ChecklistItem>

            <ChecklistItem tone={isDraftOverflow ? "danger" : "success"}>
              {isDraftOverflow
                ? `Item limit exceeded. Remove ${draftOverflowCount} more items.`
                : "Item count is within the allowed limit."}
            </ChecklistItem>

            <ChecklistItem tone={reachedCollectionLimit ? "danger" : "success"}>
              {reachedCollectionLimit
                ? "Collection limit reached. Please remove an existing collection first."
                : "Collection quota is available."}
            </ChecklistItem>

            {skippedItems > 0 && (
              <ChecklistItem tone="warning">
                {skippedItems} skipped items will not be imported.
              </ChecklistItem>
            )}

            {longItems > 0 && (
              <ChecklistItem tone="warning">
                {longItems} long tracks are included. They can still be used,
                but may need review later.
              </ChecklistItem>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-4">
          <div className="text-sm font-semibold text-[var(--mc-text)]">
            Final summary
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <SummaryMetric label="Ready" value={readyItems} tone="success" />
            <SummaryMetric
              label="Long tracks"
              value={longItems}
              tone={longItems > 0 ? "warning" : "default"}
            />
            <SummaryMetric
              label="Skipped"
              value={skippedItems}
              tone={skippedItems > 0 ? "warning" : "default"}
            />
            <SummaryMetric
              label="Duplicates removed"
              value={removedDuplicateCount}
              tone={removedDuplicateCount > 0 ? "success" : "default"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
