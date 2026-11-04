import {
  DEFAULT_KEY_BINDINGS,
  type KeyBindings,
  useSettingsModel,
} from "./settingsContext";

const useKeyBindings = () => {
  const { keyBindings, setKeyBindings } = useSettingsModel();
  return { keyBindings, setKeyBindings } as const;
};

export { DEFAULT_KEY_BINDINGS, useKeyBindings };
export type { KeyBindings };
