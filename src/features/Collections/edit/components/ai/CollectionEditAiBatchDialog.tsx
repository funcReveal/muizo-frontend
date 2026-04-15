import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import type {
  AiBatchWriteState,
  AiPageStatus,
  AiPromptPage,
} from "../../hooks/useCollectionEditAiBatch";

type Props = {
  open: boolean;
  onClose: () => void;
  aiProviderLabel: string;
  playlistItemsCount: number;

  aiPromptPages: AiPromptPage[];
  aiBatchPageIndex: number;
  onAiBatchPageChange: (pageIndex: number) => void;

  aiJsonDrafts: Record<number, string>;
  aiAppliedPages: Record<number, boolean>;
  currentAiJsonDraft: string;
  onCurrentAiJsonDraftChange: (value: string) => void;

  aiHelperNotice: string | null;
  aiParsedResult: {
    error: string | null;
    updates: Array<{
      id: string;
      answerText: string;
    }>;
  };
  aiPreview: {
    missingIds: string[];
    unchangedIds: string[];
    changedItems: Array<{
      id: string;
      title: string;
      oldAnswer: string;
      newAnswer: string;
    }>;
  };
  aiPageStatuses: AiPageStatus[];

  aiPromptText: string;
  onCopyAiPrompt: () => Promise<void>;
  onOpenAiAssistant: () => Promise<void>;

  canApplyAiBatch: boolean;
  onApplyAiBatch: () => Promise<void>;

  aiBatchWriteState: AiBatchWriteState;
  pendingAiBatchSave: AiBatchWriteState | null;
  canCloseAiBatchModal: boolean;
  aiBatchSaveProgressLabel: string;
  aiBatchSaveStepLabel: string;
  onRetryAiBatchWrite: () => Promise<void>;
  onBackToPreview: () => void;
};

export default function CollectionEditAiBatchDialog({
  open,
  onClose,
  aiProviderLabel,
  playlistItemsCount,

  aiPromptPages,
  aiBatchPageIndex,
  onAiBatchPageChange,

  aiJsonDrafts,
  aiAppliedPages,
  currentAiJsonDraft,
  onCurrentAiJsonDraftChange,

  aiHelperNotice,
  aiParsedResult,
  aiPreview,
  aiPageStatuses,

  aiPromptText,
  onCopyAiPrompt,
  onOpenAiAssistant,

  canApplyAiBatch,
  onApplyAiBatch,

  aiBatchWriteState,
  pendingAiBatchSave,
  canCloseAiBatchModal,
  aiBatchSaveProgressLabel,
  aiBatchSaveStepLabel,
  onRetryAiBatchWrite,
  onBackToPreview,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (!canCloseAiBatchModal) return;
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
          return;
        }
        onClose();
      }}
      fullWidth
      maxWidth="md"
      PaperProps={{
        className:
          "!rounded-3xl !border !border-[var(--mc-border)] !bg-[#08111f] !text-[var(--mc-text)]",
      }}
    >
      <DialogTitle className="!px-6 !pt-6 !pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mt-1 text-lg font-semibold text-[var(--mc-text)]">
              AI 批次修正答案
            </div>
          </div>

          <div className="mt-1 text-xl font-semibold text-[var(--mc-text)]">
            {playlistItemsCount} 題
          </div>
        </div>
      </DialogTitle>

      <DialogContent className="!px-6 !pb-4">
        {aiBatchWriteState.status === "idle" ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4">
              <div className="mb-4">
                <div className="text-sm font-semibold text-[var(--mc-text)]">
                  批次分頁
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiPromptPages.map((page) => {
                    const active = page.pageIndex === aiBatchPageIndex;
                    const hasDraft = Boolean(
                      aiJsonDrafts[page.pageIndex]?.trim(),
                    );
                    const isApplied = aiAppliedPages[page.pageIndex] === true;
                    const pageStatus = aiPageStatuses[page.pageIndex];

                    return (
                      <button
                        key={`${page.start}-${page.end}`}
                        type="button"
                        disabled={pendingAiBatchSave !== null}
                        onClick={() => {
                          onAiBatchPageChange(page.pageIndex);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          active
                            ? "border-[var(--mc-accent)] bg-[var(--mc-accent)]/12 text-[var(--mc-text)]"
                            : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/40 text-[var(--mc-text-muted)] hover:border-[var(--mc-accent)]/50 hover:text-[var(--mc-text)]"
                        }`}
                      >
                        第 {page.pageIndex + 1} 批
                        <span className="ml-2 text-[10px] opacity-75">
                          {page.start + 1}-{page.end}
                        </span>
                        {isApplied || pageStatus?.isComplete ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-300">
                            <CheckCircleOutlineRounded sx={{ fontSize: 14 }} />
                            已套用
                          </span>
                        ) : pageStatus?.isPartial ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-cyan-200">
                            <MoreHorizRounded sx={{ fontSize: 14 }} />
                            {pageStatus.completedCount}/{pageStatus.totalCount}
                          </span>
                        ) : hasDraft ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-200">
                            <MoreHorizRounded sx={{ fontSize: 14 }} />
                            已貼回
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--mc-text)]">
                    Step 1. 產生 Prompt
                  </div>
                </div>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void onOpenAiAssistant()}
                  disabled={pendingAiBatchSave !== null}
                  className="!bg-[var(--mc-accent)] !text-slate-950 hover:!bg-[var(--mc-accent)]/90"
                >
                  複製，並在 {aiProviderLabel} 開啟
                </Button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-[#050b14]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--mc-border)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--mc-text-muted)]">
                  <span>Prompt Preview</span>
                  <IconButton
                    size="small"
                    aria-label="複製 Prompt"
                    onClick={() => void onCopyAiPrompt()}
                    disabled={pendingAiBatchSave !== null}
                    className="!text-[var(--mc-text-muted)] hover:!text-[var(--mc-accent)]"
                  >
                    <ContentCopyRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                </div>
                <div className="max-h-80 overflow-y-auto px-4 py-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-slate-200">
                    {aiPromptText}
                  </pre>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-4">
              <div className="text-sm font-semibold text-[var(--mc-text)]">
                Step 2. 貼回 JSON 並預覽
              </div>
              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                請貼上 AI 回傳內容。支援純 JSON，也支援包在 ```json code block
                內的格式。
              </div>

              <TextField
                value={currentAiJsonDraft}
                disabled={pendingAiBatchSave !== null}
                onChange={(event) => {
                  onCurrentAiJsonDraftChange(event.target.value);
                }}
                multiline
                minRows={8}
                maxRows={14}
                fullWidth
                margin="normal"
                placeholder={
                  '```json\n{"items":[{"id":"item-id","answerText":"正式答案"}]}\n```'
                }
              />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                    會更新
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                    {aiPreview.changedItems.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                    無變更
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                    {aiPreview.unchangedIds.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--mc-text-muted)]">
                    對不到 ID
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--mc-text)]">
                    {aiPreview.missingIds.length}
                  </div>
                </div>
              </div>

              {aiParsedResult.error && (
                <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                  {aiParsedResult.error}
                </div>
              )}

              {aiHelperNotice && (
                <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-200">
                  {aiHelperNotice}
                </div>
              )}

              {aiPreview.missingIds.length > 0 && !aiParsedResult.error && (
                <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                  以下 id 在目前題庫中找不到：
                  {aiPreview.missingIds.slice(0, 8).join(", ")}
                  {aiPreview.missingIds.length > 8 ? " ..." : ""}
                </div>
              )}

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {aiPreview.changedItems.length === 0 &&
                !aiParsedResult.error ? (
                  <div className="rounded-2xl border border-dashed border-[var(--mc-border)] px-3 py-4 text-sm text-[var(--mc-text-muted)]">
                    貼上有效 JSON 後，這裡會顯示即將更新的答案差異。
                  </div>
                ) : (
                  aiPreview.changedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 p-3"
                    >
                      <div className="text-sm font-semibold text-[var(--mc-text)]">
                        {item.title}
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div className="rounded-xl border border-[var(--mc-border)]/80 bg-[var(--mc-surface)]/60 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
                            原答案
                          </div>
                          <div className="mt-1 text-sm text-[var(--mc-text)]">
                            {item.oldAnswer || "未填寫"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--mc-accent)]/35 bg-[var(--mc-accent)]/8 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--mc-text-muted)]">
                            新答案
                          </div>
                          <div className="mt-1 text-sm text-[var(--mc-text)]">
                            {item.newAnswer}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex min-h-[520px] items-center justify-center py-8">
            <div className="w-full max-w-xl rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/60 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/50">
                {aiBatchWriteState.status === "success" ? (
                  <CheckCircleOutlineRounded
                    className="text-emerald-300"
                    sx={{ fontSize: 34 }}
                  />
                ) : aiBatchWriteState.status === "error" ? (
                  <MoreHorizRounded
                    className="text-rose-200"
                    sx={{ fontSize: 34 }}
                  />
                ) : (
                  <CircularProgress
                    size={34}
                    className="!text-[var(--mc-accent)]"
                  />
                )}
              </div>

              <div className="mt-5 text-lg font-semibold text-[var(--mc-text)]">
                {aiBatchWriteState.status === "error"
                  ? "寫入失敗"
                  : aiBatchWriteState.status === "success"
                    ? aiBatchWriteState.hasNextPage
                      ? "本批寫入完成"
                      : "全部批次已完成"
                    : "正在套用並寫入變更"}
              </div>

              <div className="mt-2 text-sm text-[var(--mc-text-muted)]">
                {aiBatchSaveProgressLabel}
              </div>
              <div className="mt-1 text-sm text-[var(--mc-text)]">
                {aiBatchSaveStepLabel}
              </div>

              <div className="mt-5 grid gap-2 text-left text-sm">
                <div
                  className={`rounded-xl border px-3 py-2 ${
                    aiBatchWriteState.status === "applying"
                      ? "border-[var(--mc-accent)]/45 bg-[var(--mc-accent)]/10 text-[var(--mc-text)]"
                      : "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                  }`}
                >
                  1. 套用答案到本地狀態
                </div>

                <div
                  className={`rounded-xl border px-3 py-2 ${
                    aiBatchWriteState.status === "saving"
                      ? "border-[var(--mc-accent)]/45 bg-[var(--mc-accent)]/10 text-[var(--mc-text)]"
                      : aiBatchWriteState.status === "success"
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                        : aiBatchWriteState.status === "error"
                          ? "border-rose-500/35 bg-rose-950/25 text-rose-100"
                          : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 text-[var(--mc-text-muted)]"
                  }`}
                >
                  2. 寫入收藏庫
                </div>

                <div
                  className={`rounded-xl border px-3 py-2 ${
                    aiBatchWriteState.status === "success"
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                      : "border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 text-[var(--mc-text-muted)]"
                  }`}
                >
                  3. 準備下一批
                </div>
              </div>

              {pendingAiBatchSave ? (
                <div className="mt-5 rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface-strong)]/30 px-4 py-3 text-sm text-[var(--mc-text-muted)]">
                  本批共 {pendingAiBatchSave.count}{" "}
                  筆變更。完成前請勿關閉視窗或切換批次。
                </div>
              ) : null}

              {aiBatchWriteState.status === "error" ? (
                <div className="mt-4 rounded-2xl border border-rose-500/35 bg-rose-950/25 px-4 py-3 text-left text-sm text-rose-100">
                  {aiBatchWriteState.message}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>

      <DialogActions className="!px-6 !pb-5 !pt-0">
        {aiBatchWriteState.status === "idle" ? (
          <>
            <Button onClick={onClose} className="!text-[var(--mc-text-muted)]">
              關閉
            </Button>
            <Button
              variant="contained"
              onClick={() => void onApplyAiBatch()}
              disabled={!canApplyAiBatch}
              className="!bg-[var(--mc-accent)] !text-slate-950 hover:!bg-[var(--mc-accent)]/90 disabled:!bg-slate-700 disabled:!text-slate-300"
            >
              {`套用並寫入 ${aiPreview.changedItems.length} 筆變更`}
            </Button>
          </>
        ) : aiBatchWriteState.status === "error" ? (
          <>
            <Button
              onClick={onBackToPreview}
              className="!text-[var(--mc-text-muted)]"
            >
              回到預覽
            </Button>
            <Button onClick={onClose} className="!text-[var(--mc-text-muted)]">
              關閉
            </Button>
            <Button
              variant="contained"
              onClick={() => void onRetryAiBatchWrite()}
              className="!bg-[var(--mc-accent)] !text-slate-950 hover:!bg-[var(--mc-accent)]/90"
            >
              重試寫入
            </Button>
          </>
        ) : aiBatchWriteState.status === "success" &&
          !aiBatchWriteState.hasNextPage ? (
          <Button
            variant="contained"
            onClick={onClose}
            className="!bg-[var(--mc-accent)] !text-slate-950 hover:!bg-[var(--mc-accent)]/90"
          >
            完成
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled
            className="disabled:!bg-slate-700 disabled:!text-slate-300"
          >
            寫入中...
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
