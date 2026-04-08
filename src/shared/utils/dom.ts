/** Shared DOM utility helpers. */

/** Blurs the currently focused interactive element to dismiss virtual keyboards and tooltips. */
export const blurActiveInteractiveElement = () => {
  if (typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
};
