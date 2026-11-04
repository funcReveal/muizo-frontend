// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const controls = vi.hoisted(() => ({ animate: vi.fn(), stop: vi.fn(), reduced: false }));
vi.mock("motion/react", () => ({ animate: controls.animate, useReducedMotion: () => controls.reduced }));
import { useInitialCollectionCount } from "./useInitialCollectionCount";

beforeEach(() => {
  controls.reduced = false;
  controls.stop.mockReset();
  controls.animate.mockReset().mockImplementation((_: number, target: number, options: { onUpdate: (value: number) => void }) => {
    options.onUpdate(target / 2);
    return { stop: controls.stop };
  });
});
afterEach(cleanup);

it("counts up only when a first pending load resolves", () => {
  const { result, rerender } = renderHook(({ target }: { target: number | null }) => useInitialCollectionCount("public", target), { initialProps: { target: null as number | null } });
  expect(result.current).toBe(0);
  rerender({ target: 100 });
  expect(result.current).toBe(50);
  expect(controls.animate).toHaveBeenCalledOnce();
  rerender({ target: 120 });
  expect(result.current).toBe(120);
  expect(controls.animate).toHaveBeenCalledOnce();
  expect(controls.stop).toHaveBeenCalled();
});

it("does not animate cached data or replay when returning to a source", () => {
  const { result, rerender } = renderHook(({ source, target }: { source: string; target: number | null }) => useInitialCollectionCount(source, target), { initialProps: { source: "public", target: 103 as number | null } });
  expect(result.current).toBe(103);
  rerender({ source: "personal", target: null });
  rerender({ source: "personal", target: 10 });
  expect(controls.animate).toHaveBeenCalledOnce();
  rerender({ source: "public", target: null });
  expect(result.current).toBe(103);
  rerender({ source: "public", target: 104 });
  expect(result.current).toBe(104);
  expect(controls.animate).toHaveBeenCalledOnce();
});

it("respects reduced motion for an initial load", () => {
  controls.reduced = true;
  const { result, rerender } = renderHook(({ target }: { target: number | null }) => useInitialCollectionCount("public", target), { initialProps: { target: null as number | null } });
  rerender({ target: 103 });
  expect(result.current).toBe(103);
  expect(controls.animate).not.toHaveBeenCalled();
});
