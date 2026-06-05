import React from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import ShareRounded from "@mui/icons-material/ShareRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import { Drawer, IconButton } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { List, type RowComponentProps } from "react-window";

import { API_URL } from "@domain/room/constants";
import { CollectionReviewList } from "@features/CollectionReview";
import type { RoomSettlementHistorySummary } from "@features/RoomSession";
import { collectionReviewApi } from "@features/CollectionReview/model/collectionReviewApi";
import type { CollectionReviewSummary } from "@features/CollectionReview/model/types";
import {
  apiFetchCollectionById,
  apiFetchCollectionItemPreview,
  type CollectionItemPreviewRecord,
  type CollectionSummary,
} from "@features/CollectionContent/model/collectionContentApi";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import type { CareerCollectionRankRow } from "../../../types/career";
import CareerCollectionRankExpandedPanel from "./CareerCollectionRankExpandedPanel";
import CareerCollectionRankShareDialog from "./CareerCollectionRankShareDialog";

interface CareerCollectionRankDetailDrawerProps {
  open: boolean;
  item: CareerCollectionRankRow | null;
  onClose: () => void;
  onOpenMatch: (summary: RoomSettlementHistorySummary) => void;
}

type DrawerDetailState = {
  collection: CollectionSummary | null;
  previewItems: CollectionItemPreviewRecord[];
  reviewSummary: CollectionReviewSummary | null;
  loading: boolean;
  error: string | null;
};

type CollectionInfoTab = "playlist" | "reviews";

type CollectionPreviewRowProps = {
  items: CollectionItemPreviewRecord[];
};

const COLLECTION_PREVIEW_ROW_HEIGHT = 72;

const initialDrawerDetailState: DrawerDetailState = {
  collection: null,
  previewItems: [],
  reviewSummary: null,
  loading: false,
  error: null,
};

const formatCompactCount = (value: number | null | undefined, suffix = "") => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.max(0, Math.trunc(value)).toLocaleString("zh-TW")}${suffix}`;
};

const formatDurationLabel = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.trunc(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatVisibilityLabel = (
  visibility: CollectionSummary["visibility"] | null | undefined,
) => {
  if (visibility === "private") return "私人";
  if (visibility === "public") return "公開";
  return "未知";
};

const getCollectionThumbnail = (
  item: CareerCollectionRankRow,
  collection: CollectionSummary | null,
) =>
  item.coverThumbnailUrl ||
  collection?.cover_thumbnail_url ||
  (collection?.cover_provider === "youtube" && collection.cover_source_id
    ? `https://i.ytimg.com/vi/${collection.cover_source_id}/hqdefault.jpg`
    : null);

const getPreviewThumbnail = (item: CollectionItemPreviewRecord) =>
  item.thumbnail_url ||
  (item.provider === "youtube" && item.source_id
    ? `https://i.ytimg.com/vi/${item.source_id}/hqdefault.jpg`
    : null);

const CollectionPreviewRow = ({
  index,
  style,
  items,
}: RowComponentProps<CollectionPreviewRowProps>) => {
  const previewItem = items[index];
  if (!previewItem) return <div style={style} />;

  const thumbnail = getPreviewThumbnail(previewItem);
  const duration = formatDurationLabel(previewItem.duration_sec);

  return (
    <div style={style}>
      <div className="flex h-full items-center gap-3 border-b border-white/8 px-3 py-3 last:border-b-0">
        <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-900/80">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={previewItem.title || `題目 ${index + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
              無封面
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {previewItem.title || `題目 ${index + 1}`}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {previewItem.channel_title || "未知上傳者"}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>
        <span className="hidden shrink-0 text-xs font-medium text-cyan-100/70 sm:inline">
          #{index + 1}
        </span>
      </div>
    </div>
  );
};

const CareerCollectionRankDetailDrawer: React.FC<
  CareerCollectionRankDetailDrawerProps
> = ({ open, item, onClose, onOpenMatch }) => {
  const isMobileDrawer = useMediaQuery("(max-width: 639.95px)");
  const { authToken, refreshAuthToken } = useAuth();
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [collectionInfoTab, setCollectionInfoTab] =
    React.useState<CollectionInfoTab>("playlist");
  const [detailState, setDetailState] = React.useState<DrawerDetailState>(
    initialDrawerDetailState,
  );
  const collectionId = item?.collectionId ?? null;
  const collection = detailState.collection;
  const reviewSummary = detailState.reviewSummary;
  const questionCount =
    collection?.playable_item_count ??
    collection?.item_count ??
    item?.matchSummary?.questionCount ??
    null;
  const sourceLabel = item?.sourceLabel ?? collection?.cover_channel_title ?? null;
  const previewThumbnail = item
    ? getCollectionThumbnail(item, collection)
    : null;
  const visibility = collection?.visibility ?? null;
  const isPublic = visibility === "public";
  const ratingCount = reviewSummary?.ratingCount ?? collection?.rating_count ?? 0;
  const ratingAvg =
    ratingCount > 0
      ? (reviewSummary?.ratingAvg ?? collection?.rating_avg ?? 0)
      : 0;
  const ratingLabel =
    ratingCount > 0
      ? `${ratingAvg.toFixed(ratingAvg % 1 === 0 ? 0 : 1)} / 5`
      : "尚無評分";

  const handleOpenMatch = React.useCallback(
    (summary: RoomSettlementHistorySummary) => {
      onOpenMatch(summary);
    },
    [onOpenMatch],
  );

  React.useEffect(() => {
    if (!open) {
      setShareDialogOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    setCollectionInfoTab("playlist");
  }, [collectionId]);

  React.useEffect(() => {
    if (!open || !collectionId || !API_URL) {
      setDetailState(initialDrawerDetailState);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setDetailState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));

      try {
        const token = authToken
          ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken })
          : null;
        const [collectionResult, previewResult, reviewResult] =
          await Promise.allSettled([
            apiFetchCollectionById(API_URL, token, collectionId),
            apiFetchCollectionItemPreview(API_URL, token, collectionId, {
              page: 1,
              pageSize: 30,
            }),
            collectionReviewApi.fetchSummary({
              collectionId,
              authToken,
              refreshAuthToken,
            }),
          ]);

        if (cancelled) return;

        const nextCollection =
          collectionResult.status === "fulfilled" &&
          collectionResult.value.ok &&
          collectionResult.value.payload?.ok
            ? collectionResult.value.payload.data?.collection ?? null
            : null;
        const nextPreviewItems =
          previewResult.status === "fulfilled" &&
          previewResult.value.ok &&
          previewResult.value.payload?.ok
            ? previewResult.value.payload.data?.items ?? []
            : [];
        const nextReviewSummary =
          reviewResult.status === "fulfilled" ? reviewResult.value : null;
        const hasError =
          collectionResult.status === "rejected" ||
          previewResult.status === "rejected" ||
          reviewResult.status === "rejected" ||
          (collectionResult.status === "fulfilled" && !collectionResult.value.ok);

        setDetailState({
          collection: nextCollection,
          previewItems: nextPreviewItems,
          reviewSummary: nextReviewSummary,
          loading: false,
          error: hasError ? "部分題庫資訊暫時無法讀取。" : null,
        });
      } catch {
        if (!cancelled) {
          setDetailState({
            ...initialDrawerDetailState,
            loading: false,
            error: "題庫資訊暫時無法讀取。",
          });
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [authToken, collectionId, open, refreshAuthToken]);

  return (
    <>
      <Drawer
        anchor={isMobileDrawer ? "bottom" : "right"}
        open={open}
        onClose={onClose}
        sx={{ zIndex: 1510 }}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          className:
            "!overflow-hidden !bg-[rgb(10,13,20)] !text-slate-100 !shadow-2xl !shadow-slate-950/80 max-sm:!h-[92dvh] max-sm:!w-full max-sm:!rounded-t-[24px] max-sm:!border-t max-sm:!border-white/10 sm:!h-dvh sm:!w-[min(1120px,calc(100vw-24px))] sm:!max-w-none sm:!rounded-l-[24px] sm:!border-l sm:!border-white/10",
        }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.13),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.62),rgba(10,13,20,0.98))] p-3 sm:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--mc-text)] sm:text-lg">
                題庫戰績
              </h2>
              <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                最佳紀錄與近期遊玩
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                aria-label="分享題庫戰績"
                onClick={() => setShareDialogOpen(true)}
                size="small"
                disabled={!item}
                sx={{
                  color: "rgba(254,243,199,0.92)",
                  border: "1px solid rgba(253,230,138,0.24)",
                  backgroundColor: "rgba(253,230,138,0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(253,230,138,0.16)",
                  },
                }}
              >
                <ShareRounded fontSize="small" />
              </IconButton>

              <IconButton
                aria-label="關閉題庫戰績詳情"
                onClick={onClose}
                size="small"
                sx={{
                  color: "rgba(226,232,240,0.82)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.045)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pt-4 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] lg:overflow-hidden">
            {item ? (
              <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="space-y-3 lg:flex lg:min-h-0 lg:flex-col lg:self-stretch lg:space-y-3">
                  <section className="shrink-0 overflow-hidden rounded-[22px] border border-cyan-300/14 bg-slate-950/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_-34px_rgba(34,211,238,0.5)]">
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-900/80">
                      {previewThumbnail ? (
                        <img
                          src={previewThumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                          無封面
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.16)_46%,rgba(2,6,23,0.86)_100%)]" />
                      <div className="absolute left-3 top-3">
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm",
                            isPublic
                              ? "border-cyan-200/20 bg-slate-950/58 text-cyan-50"
                              : "border-white/12 bg-slate-950/58 text-slate-100",
                          ].join(" ")}
                        >
                          {isPublic ? (
                            <PublicOutlined sx={{ fontSize: 13 }} />
                          ) : (
                            <LockOutlined sx={{ fontSize: 13 }} />
                          )}
                          {formatVisibilityLabel(visibility)}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex min-w-0 items-center gap-2 text-[12px] leading-5 text-slate-300/88">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <StarRounded
                              sx={{
                                fontSize: 15,
                                color:
                                  ratingCount > 0
                                    ? "rgba(250, 204, 21, 0.95)"
                                    : "rgba(148, 163, 184, 0.56)",
                              }}
                            />
                            <span className="shrink-0 font-semibold text-slate-100/92">
                              {ratingLabel}
                            </span>
                          </span>
                          {ratingCount > 0 ? (
                            <span className="min-w-0 truncate text-slate-400">
                              {ratingCount.toLocaleString("zh-TW")} 則評分
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-white/8 px-4 py-3.5">
                      <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-slate-50">
                        {item.title}
                      </h3>
                      {sourceLabel ? (
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {sourceLabel}
                        </p>
                      ) : null}
                      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-slate-400">
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <span className="text-cyan-100/80">題數</span>
                          {formatCompactCount(questionCount, " 題")}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <span className="text-cyan-100/80">遊玩</span>
                          {formatCompactCount(item.playCount, " 場")}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <span className="text-cyan-100/80">收藏</span>
                          {formatCompactCount(collection?.favorite_count)}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <p
                        className={[
                          "line-clamp-4 whitespace-pre-wrap text-sm leading-6",
                          collection?.description
                            ? "text-slate-300"
                            : "text-slate-500",
                        ].join(" ")}
                      >
                        {collection?.description ||
                          (detailState.loading
                            ? "正在讀取題庫描述..."
                            : "題庫未提供說明。")}
                      </p>

                      {detailState.error ? (
                        <div className="mt-3 rounded-[12px] border border-amber-200/16 bg-amber-200/[0.055] px-3 py-2 text-xs text-amber-50/78">
                          {detailState.error}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[16px] border border-cyan-300/12 bg-slate-950/30 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <div
                      role="tablist"
                      aria-label="題庫資訊清單"
                      className="grid grid-cols-2 gap-1 border-b border-white/8 bg-slate-950/32 p-1"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={collectionInfoTab === "playlist"}
                        onClick={() => setCollectionInfoTab("playlist")}
                        className={[
                          "rounded-lg px-3 py-2 text-center text-sm font-semibold transition",
                          collectionInfoTab === "playlist"
                            ? "bg-cyan-200/12 text-cyan-50"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                        ].join(" ")}
                      >
                        題庫內容
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={collectionInfoTab === "reviews"}
                        onClick={() => setCollectionInfoTab("reviews")}
                        className={[
                          "rounded-lg px-3 py-2 text-center text-sm font-semibold transition",
                          collectionInfoTab === "reviews"
                            ? "bg-cyan-200/12 text-cyan-50"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                        ].join(" ")}
                      >
                        評論
                        <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] leading-none text-slate-200">
                          {reviewSummary
                            ? reviewSummary.reviewCommentCount.toLocaleString(
                                "zh-TW",
                              )
                            : 0}
                        </span>
                      </button>
                    </div>

                    {collectionInfoTab === "playlist" ? (
                      <div className="h-[292px] min-h-0 overflow-hidden lg:h-auto lg:flex-1">
                        {detailState.previewItems.length > 0 ? (
                          <List<CollectionPreviewRowProps>
                            style={{
                              height: "100%",
                              width: "100%",
                            }}
                            rowCount={detailState.previewItems.length}
                            rowHeight={COLLECTION_PREVIEW_ROW_HEIGHT}
                            rowProps={{ items: detailState.previewItems }}
                            rowComponent={CollectionPreviewRow}
                          />
                        ) : (
                          <div className="px-3 py-6 text-sm text-slate-400">
                            {detailState.loading
                              ? "正在讀取題庫內容..."
                              : "這個題庫目前沒有可預覽的題目。"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-white/8 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                              <StarRounded
                                sx={{
                                  fontSize: 17,
                                  color:
                                    ratingCount > 0
                                      ? "rgba(250, 204, 21, 0.95)"
                                      : "rgba(148, 163, 184, 0.56)",
                                }}
                              />
                              {ratingLabel}
                            </div>
                            <div className="text-xs text-slate-400">
                              {ratingCount > 0
                                ? `${ratingCount.toLocaleString("zh-TW")} 則評分`
                                : "尚無評分"}
                            </div>
                          </div>
                        </div>

                        <div className="h-[250px] min-h-0 lg:flex-1">
                          {collectionId ? (
                            <CollectionReviewList
                              collectionId={collectionId}
                              enabled={open && collectionInfoTab === "reviews"}
                              limit={8}
                              className="h-full py-1"
                            />
                          ) : (
                            <div className="px-3 py-6 text-sm text-slate-400">
                              尚未取得題庫評論。
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </section>
                </aside>

                <main className="min-w-0 lg:min-h-0">
                  <CareerCollectionRankExpandedPanel
                    item={item}
                    onOpenMatch={handleOpenMatch}
                  />
                </main>
              </div>
            ) : (
              <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--mc-text-muted)]">
                尚未選擇題庫。
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <CareerCollectionRankShareDialog
        open={shareDialogOpen}
        item={item}
        onClose={() => setShareDialogOpen(false)}
      />
    </>
  );
};

export default CareerCollectionRankDetailDrawer;
