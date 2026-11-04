const CHAT_SHORTCUT_INTERACTIVE_SELECTOR = [
  ".floating-chat-root",
  "input",
  "textarea",
  "select",
  "button",
  "a",
  "[contenteditable='true']",
  "[role='button']",
  "[role='textbox']",
  "[role='dialog']",
].join(", ");

export const isGlobalChatShortcutTarget = (target: EventTarget | null) => {
  const targetElement = target instanceof HTMLElement
    ? target
    : document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  return Boolean(targetElement?.closest(CHAT_SHORTCUT_INTERACTIVE_SELECTOR));
};
