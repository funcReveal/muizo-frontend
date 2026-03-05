import { useEffect } from "react";

import type { GameState } from "../../../model/types";

type UseGameRoomChoiceHotkeysArgs = {
  enabled: boolean;
  choices: GameState["choices"] | undefined;
  keyBindings: Record<number, string>;
  onSubmitChoice: (choiceIndex: number) => void;
};

const useGameRoomChoiceHotkeys = ({
  enabled,
  choices,
  keyBindings,
  onSubmitChoice,
}: UseGameRoomChoiceHotkeysArgs) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        if (active.tagName === "TEXTAREA" || active.isContentEditable) {
          return;
        }
        if (active.tagName === "INPUT") {
          const input = active as HTMLInputElement;
          const type = (input.type || "text").toLowerCase();
          if (type !== "range") {
            return;
          }
        }
      }
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (!enabled) return;
      if (!choices?.length) return;

      const pressedKey = event.key.toUpperCase();
      const matchedBinding = Object.entries(keyBindings).find(
        ([, key]) => key.toUpperCase() === pressedKey,
      );
      if (!matchedBinding) return;

      const choiceIdx = Number(matchedBinding[0]);
      const choice = choices[choiceIdx];
      if (!choice) return;

      event.preventDefault();
      onSubmitChoice(choice.index);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [choices, enabled, keyBindings, onSubmitChoice]);
};

export default useGameRoomChoiceHotkeys;
