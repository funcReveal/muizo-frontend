import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

type Entry = { loaded: boolean; count: number };

export const useInitialCollectionCount = (source: string, target: number | null) => {
  const reduceMotion = useReducedMotion();
  const entries = useRef<Record<string, Entry>>({
    [source]: { loaded: target !== null, count: target ?? 0 },
  });
  const [displayed, setDisplayed] = useState<Record<string, number>>({ [source]: target ?? 0 });

  useEffect(() => {
    const entry = entries.current[source] ?? { loaded: target !== null, count: target ?? 0 };
    entries.current[source] = entry;
    const show = (value: number) => setDisplayed((previous) => previous[source] === value ? previous : { ...previous, [source]: value });
    if (target === null) {
      show(entry.count);
      return;
    }
    const firstLoad = !entry.loaded;
    entry.loaded = true;
    entry.count = target;
    if (!firstLoad || reduceMotion || target === 0) {
      show(target);
      return;
    }
    const animation = animate(0, target, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => show(Math.round(value)),
      onComplete: () => show(target),
    });
    return () => {
      animation.stop();
      show(target);
    };
  }, [source, target, reduceMotion]);

  return displayed[source] ?? target ?? 0;
};
