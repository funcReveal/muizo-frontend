export const CHAT_BUBBLE_SIZE = 56;
export const CHAT_POSITION_KEY = "muizo:mobile-chat-position:v1";
export type Point = { x: number; y: number };
export type ChatBounds = { left: number; top: number; right: number; bottom: number };

export function clampBubble(point: Point, bounds: ChatBounds): Point {
  return {
    x: Math.max(bounds.left, Math.min(point.x, bounds.right - CHAT_BUBBLE_SIZE)),
    y: Math.max(bounds.top, Math.min(point.y, bounds.bottom - CHAT_BUBBLE_SIZE)),
  };
}

export function positionFromRatio(ratio: Point, bounds: ChatBounds): Point {
  return clampBubble({ x: bounds.left + ratio.x * Math.max(0, bounds.right - bounds.left - CHAT_BUBBLE_SIZE), y: bounds.top + ratio.y * Math.max(0, bounds.bottom - bounds.top - CHAT_BUBBLE_SIZE) }, bounds);
}

export function positionToRatio(point: Point, bounds: ChatBounds): Point {
  return { x: (point.x - bounds.left) / Math.max(1, bounds.right - bounds.left - CHAT_BUBBLE_SIZE), y: (point.y - bounds.top) / Math.max(1, bounds.bottom - bounds.top - CHAT_BUBBLE_SIZE) };
}

export function nearestBubbleCorner(point: Point, bounds: ChatBounds): Point {
  const bubble = clampBubble(point, bounds);
  return {
    x: bubble.x + CHAT_BUBBLE_SIZE / 2 <= (bounds.left + bounds.right) / 2 ? bounds.left : bounds.right - CHAT_BUBBLE_SIZE,
    y: bubble.y + CHAT_BUBBLE_SIZE / 2 <= (bounds.top + bounds.bottom) / 2 ? bounds.top : bounds.bottom - CHAT_BUBBLE_SIZE,
  };
}

export function chatWindowRect(point: Point, bounds: ChatBounds) {
  const bubble = clampBubble(point, bounds);
  const gap = 12;
  const availableHeight = Math.max(0, bounds.bottom - bounds.top);
  const availableWidth = Math.max(0, bounds.right - bounds.left);
  const desiredWidth = availableWidth;
  const desiredHeight = availableHeight;
  const above = Math.max(0, bubble.y - gap - bounds.top);
  const below = Math.max(0, bounds.bottom - bubble.y - CHAT_BUBBLE_SIZE - gap);
  const leftSpace = Math.max(0, bubble.x - gap - bounds.left);
  const rightSpace = Math.max(0, bounds.right - bubble.x - CHAT_BUBBLE_SIZE - gap);

  // Leave the toggle fully exposed. On short/wide viewports, use a side placement.
  if (Math.max(above, below) < Math.min(300, desiredHeight) && Math.max(leftSpace, rightSpace) >= Math.min(320, desiredWidth)) {
    const placeLeft = leftSpace >= rightSpace;
    const width = Math.min(desiredWidth, placeLeft ? leftSpace : rightSpace);
    const height = desiredHeight;
    const left = placeLeft ? bubble.x - gap - width : bubble.x + CHAT_BUBBLE_SIZE + gap;
    const top = Math.max(bounds.top, Math.min(bubble.y, bounds.bottom - height));
    return { left, top, width, height };
  }

  const placeAbove = above >= below;
  const width = desiredWidth;
  const height = Math.min(desiredHeight, placeAbove ? above : below);
  const left = Math.max(bounds.left, Math.min(bubble.x + CHAT_BUBBLE_SIZE - width, bounds.right - width));
  const top = placeAbove ? bubble.y - gap - height : bubble.y + CHAT_BUBBLE_SIZE + gap;
  return { left, top, width, height };
}
