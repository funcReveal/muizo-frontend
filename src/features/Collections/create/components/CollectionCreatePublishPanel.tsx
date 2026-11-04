import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import ComposerCount from "./ComposerCount";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import QueueMusicRounded from "@mui/icons-material/QueueMusicRounded";
import CreateHelp from "./CreateHelp";
import SiteTooltip from "@shared/ui/SiteTooltip";
import {
  CategoryDrawerPanel,
  type CategoryDetectResult,
} from "@features/CollectionCategory";

type Props = {
  onReviewItems?: () => void;
  actions?: ReactNode;
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

export default function CollectionCreatePublishPanel({
  onReviewItems,
  actions,
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
  const reduce = useReducedMotion();
  const visibilityId = useId();
  const visibilitySelection = (
    <motion.span
      aria-hidden="true"
      className="create-visibility-selection"
      layoutId={`${visibilityId}-visibility`}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 36, mass: 0.7 }
      }
    />
  );
  const trimmedTitle = title.trim();
  const hasTitle = trimmedTitle.length > 0;
  const hasPlayableItems = readyItems > 0;

  // Category is required for both private and public — backend enforces it
  const needsCategory = !categoryId;

  const checks = [
    { label: "題庫名稱", ready: hasTitle },
    {
      label: `${readyItems} 首歌曲`,
      ready: hasPlayableItems && !isDraftOverflow,
    },
    { label: "分類", ready: !needsCategory },
    { label: "題庫額度", ready: !reachedCollectionLimit },
  ];
  return (
    <section className="create-publish-workspace" aria-label="題庫設定">
      <div className="create-publish-form">
        <div className="create-section-heading">
          <h2>為題庫命名</h2>
          <CreateHelp label="建立題庫說明">
            確認名稱與分類後即可建立。若儲存中斷，可從草稿繼續，不需要重新匯入。
          </CreateHelp>
        </div>
        <label className="create-field-label" htmlFor="create-title">
          題庫名稱 <span className="create-required">必填</span>
        </label>
        <SiteTooltip title={!hasTitle ? "請輸入題庫名稱" : undefined}>
        <input
          id="create-title"
          required
          className="create-text-input"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="例如：YOASOBI 前奏挑戰"
          aria-invalid={!hasTitle}
        />
        </SiteTooltip>
        <details className="create-disclosure">
          <summary>
            補充介紹 <span>選填</span>
          </summary>
          <textarea
            className="create-text-input"
            aria-label="題庫介紹"
            placeholder="想對挑戰者說些什麼？"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          <small>{description.length} / 500</small>
        </details>
        <div className="create-section-heading create-visibility-heading">
          <h2>分享給誰？</h2>
          <CreateHelp label="可見範圍說明">
            公開題庫會出現在收藏庫，其他玩家也能用來開房。私人題庫只會出現在你的帳號中。
          </CreateHelp>
        </div>
        <div
          className="create-visibility-options"
          role="group"
          aria-label="題庫可見範圍"
        >
          <button
            type="button"
            aria-pressed={visibility === "public"}
            onClick={() => onVisibilityChange("public")}
          >
            {visibility === "public" && visibilitySelection}
            <PublicOutlined />
            <span>
              <strong>公開</strong>
              <small>所有玩家</small>
            </span>
          </button>
          <SiteTooltip
            title={
              reachedPrivateCollectionLimit
                ? `私人題庫已達 ${maxPrivateCollectionsPerUser} 份上限`
                : undefined
            }
          >
            <button
              type="button"
              aria-pressed={visibility === "private"}
              aria-disabled={reachedPrivateCollectionLimit}
              onClick={() => {
                if (!reachedPrivateCollectionLimit)
                  onVisibilityChange("private");
              }}
            >
              {visibility === "private" && visibilitySelection}
              <LockOutlined />
              <span>
                <strong>私人</strong>
                <small>
                  {reachedPrivateCollectionLimit ? "已達上限" : "只有自己"}
                </small>
              </span>
            </button>
          </SiteTooltip>
        </div>
        <details className="create-disclosure create-category" open>
          <SiteTooltip title={needsCategory ? "請選擇題庫分類" : undefined}>
          <summary>
            分類與語言{" "}
            <span data-ready={!needsCategory}>
              {needsCategory ? "必填" : "已設定"}
            </span>
          </summary>
          </SiteTooltip>
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
        </details>
      </div>
      <aside className="create-publish-check" aria-label="建立前檢查">
        <div className="create-publish-cover">
          <QueueMusicRounded />
          <span>
            <ComposerCount value={readyItems} />
            <small> 首歌曲</small>
          </span>
          <strong>{title.trim() || "未命名題庫"}</strong>
          <span className="create-cover-visibility">
            {visibility === "public" ? (
              <PublicOutlined fontSize="small" />
            ) : (
              <LockOutlined fontSize="small" />
            )}
            {visibility === "public" ? "公開題庫" : "私人題庫"}
          </span>
        </div>
        <div className="create-check-heading">
          <h3>建立前檢查</h3>
          <span>
            {checks.filter((check) => check.ready).length} / {checks.length}
          </span>
        </div>
        <div
          className="create-check-track"
          role="progressbar"
          aria-label="建立條件完成度"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={checks.filter((check) => check.ready).length}
        >
          <motion.span
            initial={false}
            animate={{
              scaleX: checks.filter((check) => check.ready).length / 4,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 150, damping: 28 }
            }
          />
        </div>
        <ul className="create-check-list">
          {checks.map((check) => (
            <SiteTooltip key={check.label} title={!check.ready ? (isDraftOverflow && check.label.includes("首歌曲") ? `曲目超過上限，請移除 ${draftOverflowCount} 首歌曲` : reachedCollectionLimit && check.label === "題庫額度" ? "題庫數量已達上限，請先移除不需要的題庫" : `請完成${check.label}`) : undefined}>
            <li data-ready={check.ready} tabIndex={!check.ready ? 0 : undefined} onClick={!check.ready && isDraftOverflow && check.label.includes("首歌曲") ? onReviewItems : undefined}>
              {check.ready ? (
                <CheckCircleOutlineRounded fontSize="small" />
              ) : (
                <ErrorOutlineRounded fontSize="small" />
              )}
              <span>{check.label}</span>
            </li>
            </SiteTooltip>
          ))}
        </ul>
        {(longItems > 0 || skippedItems > 0 || removedDuplicateCount > 0) && (
          <CreateHelp label="匯入整理摘要">
            超長歌曲 {longItems} 首、未能匯入 {skippedItems} 首、已排除重複{" "}
            {removedDuplicateCount} 首。
          </CreateHelp>
        )}
        <div className="create-publish-state" data-ready={isReadyToCreate}>
          {isReadyToCreate
            ? "一切就緒，讓大家來挑戰"
            : "完成名稱與分類，就能建立題庫"}
        </div>
        {actions}
      </aside>
    </section>
  );
}
