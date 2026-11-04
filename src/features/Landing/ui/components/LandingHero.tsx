import React, { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "motion/react";

const rotatingWords = ["華語流行", "迷因 meme", "遊戲 BGM", "J-POP", "K-POP"];

const TYPING_SPEED_MS = 95;
const DELETING_SPEED_MS = 60;
const HOLD_AFTER_TYPED_MS = 3000;
const HOLD_AFTER_DELETED_MS = 220;

const LandingHero: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const maxWordLength = useMemo(
    () => rotatingWords.reduce((max, word) => Math.max(max, word.length), 0),
    [],
  );

  const activeWord = rotatingWords[wordIndex];
  const visibleWord = reduceMotion ? rotatingWords[0] : activeWord.slice(0, typedLength);

  useEffect(() => {
    if (reduceMotion) return;
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
  }, [activeWord.length, isDeleting, typedLength, reduceMotion]);

  return (
    <div className="landing-hero">
      <div className="landing-hero-copy">
        <h1 className="landing-title text-[2.15rem] leading-[1.2] text-[var(--mc-text)] sm:text-[2.5rem] lg:text-[3rem]">
          <span className="sr-only">和朋友一起玩線上猜歌。</span>
          <span className="landing-title-line" aria-hidden="true">
          <span>和朋友一起玩</span>
          <span
            aria-hidden="true"
            className="landing-word-slot"
            style={
              {
                "--mq-word-slot-width": `${maxWordLength + 1}ch`,
              } as CSSProperties
            }
          >
            <span className="landing-word-content">
              <span className="landing-word-text">{visibleWord}</span>
              <span className="landing-word-caret" />
            </span>
          </span>
          </span>
          <span className="block landing-title-accent">
            <span>創建房間，</span><span className="landing-title-invite">邀請好友線上猜歌！</span>
          </span>
        </h1>
        <p className="landing-hero-vision">
          「我們不只想讓猜歌更方便、互動更即時，也希望每一次出題都能把好歌重新帶回大家耳邊，讓被記憶收藏的旋律與創作者再次被看見。」
        </p>

      </div>
    </div>
  );
};

export default LandingHero;
