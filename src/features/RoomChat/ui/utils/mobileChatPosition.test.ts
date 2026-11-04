import { describe, expect, it } from "vitest";
import { chatWindowRect, clampBubble, nearestBubbleCorner, positionFromRatio, positionToRatio } from "./mobileChatPosition";

const bounds = { left: 12, top: 20, right: 378, bottom: 828 };
describe("mobile chat positioning", () => {
  it("snaps to the closest of all four corners and uses all vertical room", () => {
    for (const [point, expected] of [
      [{ x: 100, y: 200 }, { x: 12, y: 20 }],
      [{ x: 260, y: 200 }, { x: 322, y: 20 }],
      [{ x: 100, y: 600 }, { x: 12, y: 772 }],
      [{ x: 260, y: 600 }, { x: 322, y: 772 }],
    ]) {
      const corner = nearestBubbleCorner(point, bounds);
      expect(corner).toEqual(expected);
      const rect = chatWindowRect(corner, bounds);
      expect(rect.width).toBe(366);
      expect(rect.height).toBe(740);
    }
  });
  it("keeps the entire bubble reachable at every edge", () => {
    expect(clampBubble({ x: -500, y: -500 }, bounds)).toEqual({ x: 12, y: 20 });
    expect(clampBubble({ x: 5000, y: 5000 }, bounds)).toEqual({ x: 322, y: 772 });
  });
  it("restores relative placement after orientation or viewport changes", () => {
    const point = { x: 100, y: 300 };
    const ratio = positionToRatio(point, bounds);
    expect(positionFromRatio(ratio, bounds)).toEqual(point);
    const landscape = { left: 20, top: 12, right: 824, bottom: 378 };
    const restored = positionFromRatio(ratio, landscape);
    expect(restored.x).toBeGreaterThan(landscape.left);
    expect(restored.y + 56).toBeLessThanOrEqual(landscape.bottom);
  });
  it("keeps the floating window inside safe bounds from any bubble corner", () => {
    for (const point of [{ x: 12, y: 20 }, { x: 322, y: 20 }, { x: 12, y: 772 }, { x: 322, y: 772 }]) {
      const rect = chatWindowRect(point, bounds);
      expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
      expect(rect.top).toBeGreaterThanOrEqual(bounds.top);
      expect(rect.left + rect.width).toBeLessThanOrEqual(bounds.right);
      expect(rect.top + rect.height).toBeLessThanOrEqual(bounds.bottom);
    }
  });
  it("fits above an on-screen keyboard instead of keeping the old window height", () => {
    const keyboardBounds = { left: 12, top: 20, right: 378, bottom: 310 };
    const rect = chatWindowRect({ x: 322, y: 250 }, keyboardBounds);
    expect(rect.height).toBe(218);
    expect(rect.top + rect.height).toBeLessThanOrEqual(250 - 12);
  });
  it("never covers the persistent toggle, including middle positions and landscape", () => {
    for (const area of [bounds, { left: 12, top: 12, right: 832, bottom: 374 }, { left: 12, top: 12, right: 308, bottom: 330 }]) {
      for (const x of [0, .25, .5, .75, 1]) {
        for (const y of [0, .25, .5, .75, 1]) {
          const point = positionFromRatio({ x, y }, area);
          const rect = chatWindowRect(point, area);
          expect(rect.left).toBeGreaterThanOrEqual(area.left);
          expect(rect.top).toBeGreaterThanOrEqual(area.top);
          expect(rect.left + rect.width).toBeLessThanOrEqual(area.right);
          expect(rect.top + rect.height).toBeLessThanOrEqual(area.bottom);
          const separate = rect.left + rect.width <= point.x - 12 || rect.left >= point.x + 56 + 12 || rect.top + rect.height <= point.y - 12 || rect.top >= point.y + 56 + 12;
          expect(separate).toBe(true);
        }
      }
    }
  });
});
