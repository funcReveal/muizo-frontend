import type { Variants } from "motion/react";

export const appEase = [0.22, 1, 0.36, 1] as const;

export const appMotionTransition = {
  duration: 0.22,
  ease: appEase,
};

export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: appMotionTransition,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.16,
      ease: appEase,
    },
  },
};

export const panelReveal: Variants = {
  initial: {
    opacity: 0,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: appMotionTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: appEase,
    },
  },
};
