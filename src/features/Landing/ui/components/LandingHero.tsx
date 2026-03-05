import React, { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const rotatingWords = ["華語流行", "迷因 meme", "遊戲 BGM", "J-POP", "K-POP"];

const TYPING_SPEED_MS = 95;
const DELETING_SPEED_MS = 60;
const HOLD_AFTER_TYPED_MS = 3000;
const HOLD_AFTER_DELETED_MS = 220;

const LandingHero: React.FC = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const maxWordLength = useMemo(
    () => rotatingWords.reduce((max, word) => Math.max(max, word.length), 0),
    [],
  );

  const activeWord = rotatingWords[wordIndex];
  const visibleWord = activeWord.slice(0, typedLength);

  useEffect(() => {
    const isFullyTyped = typedLength === activeWord.length;
    const isFullyDeleted = typedLength === 0;
    let delay = isDeleting ? DELETING_SPEED_MS : TYPING_SPEED_MS;

    if (!isDeleting && isFullyTyped) {
      delay = HOLD_AFTER_TYPED_MS;
    } else if (isDeleting && isFullyDeleted) {
      delay = HOLD_AFTER_DELETED_MS;
    }

    const timer = window.setTimeout(() => {
      if (!isDeleting && isFullyTyped) {
        setIsDeleting(true);
        return;
      }
      if (isDeleting && isFullyDeleted) {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % rotatingWords.length);
        return;
      }
      setTypedLength((prev) => prev + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeWord.length, isDeleting, typedLength]);

  return (
    <div className="flex min-w-0 flex-col justify-between gap-6">
      <div className="space-y-5">
        <h2 className="landing-title text-[2.15rem] leading-[1.2] text-[var(--mc-text)] sm:text-[2.5rem] lg:text-[3rem]">
          和朋友一起猜
          <span
            className="landing-word-slot"
            style={
              {
                "--mq-word-slot-width": `${maxWordLength + 1}ch`,
              } as CSSProperties
            }
          >
            <span className="landing-word-text">{visibleWord}</span>
            <span className="landing-word-caret" />
          </span>
          <span className="block landing-title-accent">
            秒進房間，直接開始挑戰
          </span>
        </h2>
        <p className="max-w-[92ch] text-[13px] leading-6 text-[var(--mc-text-muted)] sm:text-sm">
          推薦使用 Google
          登入，完整啟用播放清單同步與收藏資料延續。若只想快速試玩，也可以用訪客模式立即加入。
        </p>
      </div>
    </div>
  );
};

export default LandingHero;
