import { useEffect, useRef } from "react";

import type { GameState } from "../../../Room/model/types";

type UseGameRoomChoiceHotkeysArgs = {
  enabled: boolean;
  choices: GameState["choices"] | undefined;
  keyBindings: Record<number, string>;
  onSubmitChoice: (choiceIndex: number) => void;
};

const normalizeBindingKey = (value: string) => value.trim().toUpperCase();

const getPressedKey = (event: KeyboardEvent) => {
  // 優先用實體鍵位，避免輸入法 / 鍵盤配置造成 event.key 不穩
  if (event.code.startsWith("Key") && event.code.length === 4) {
    return event.code.slice(3).toUpperCase();
  }
  return event.key.trim().toUpperCase();
};

const shouldIgnoreTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    const type = (input.type || "text").toLowerCase();
    return type !== "range";
  }
  return false;
};

const useGameRoomChoiceHotkeys = ({
  enabled,
  choices,
  keyBindings,
  onSubmitChoice,
}: UseGameRoomChoiceHotkeysArgs) => {
  const enabledRef = useRef(enabled);
  const choicesRef = useRef(choices);
  const keyBindingsRef = useRef(keyBindings);
  const onSubmitChoiceRef = useRef(onSubmitChoice);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    choicesRef.current = choices;
  }, [choices]);

  useEffect(() => {
    keyBindingsRef.current = keyBindings;
  }, [keyBindings]);

  useEffect(() => {
    onSubmitChoiceRef.current = onSubmitChoice;
  }, [onSubmitChoice]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.repeat) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (!enabledRef.current) return;
      if (!choicesRef.current?.length) return;
      if (shouldIgnoreTarget(event.target)) return;

      const pressedKey = getPressedKey(event);

      const matchedBinding = Object.entries(keyBindingsRef.current).find(
        ([, key]) => normalizeBindingKey(key) === pressedKey,
      );
      if (!matchedBinding) return;

      const choiceSlot = Number(matchedBinding[0]);
      const choice = choicesRef.current[choiceSlot];
      if (!choice) return;

      event.preventDefault();
      onSubmitChoiceRef.current(choice.index);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
};

export default useGameRoomChoiceHotkeys;
