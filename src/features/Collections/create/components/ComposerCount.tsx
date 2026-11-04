import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

export default function ComposerCount({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const target = useMotionValue(value);
  const spring = useSpring(target, { stiffness: 170, damping: 28, mass: 0.7 });
  const displayed = useTransform(reduce ? target : spring, (latest) =>
    Math.round(latest).toLocaleString("zh-TW"),
  );
  useEffect(() => {
    target.set(value);
  }, [target, value]);
  return (
    <span className="composer-count">
      <motion.span aria-hidden="true">{displayed}</motion.span>
      <span className="sr-only">{value.toLocaleString("zh-TW")}</span>
    </span>
  );
}
