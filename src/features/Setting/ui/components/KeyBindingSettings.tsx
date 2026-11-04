import React from "react";

import type { KeyBindings } from "../../model/useKeyBindings";

interface KeyBindingSettingsProps {
  keyBindings: KeyBindings;
  onChange: (next: KeyBindings) => void;
  disabled?: boolean;
}

const SLOT_LABELS = [
  "左上選項",
  "右上選項",
  "左下選項",
  "右下選項",
] as const;

const normalizeKeyInput = (raw: string) => {
  const chars = raw.trim().toUpperCase().replace(/\s+/g, "");
  return chars.slice(0, 1);
};

const applyBindingSwap = (
  currentBindings: KeyBindings,
  targetIndex: number,
  rawValue: string,
) => {
  const nextValue = normalizeKeyInput(rawValue);
  if (!nextValue) {
    return {
      ...currentBindings,
      [targetIndex]: "",
    };
  }

  const nextBindings: KeyBindings = {
    ...currentBindings,
  };

  const previousTargetValue = normalizeKeyInput(currentBindings[targetIndex] ?? "");
  const occupiedIndex = Object.entries(currentBindings).find(([index, value]) => {
    if (Number(index) === targetIndex) return false;
    return normalizeKeyInput(value ?? "") === nextValue;
  });

  nextBindings[targetIndex] = nextValue;

  if (occupiedIndex) {
    const swapIndex = Number(occupiedIndex[0]);
    nextBindings[swapIndex] = previousTargetValue;
  }

  return nextBindings;
};

const KeyBindingSettings: React.FC<KeyBindingSettingsProps> = ({
  keyBindings,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 text-xs text-slate-200 sm:grid-cols-2">
        {SLOT_LABELS.map((label, idx) => {
          const current = normalizeKeyInput(keyBindings[idx] ?? "");
          return (
            <label
              key={`${label}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-950/45 px-3 py-2.5 transition hover:border-slate-500/70"
            >
              <span className="min-w-0">
                <span className="block text-[11px] text-slate-400">{label}</span>
                <span className="block text-[12px] text-slate-300">
                  按鍵槽 {idx + 1}
                </span>
              </span>

              <input
                aria-label={`${label} 按鍵設定`}
                value={current}
                maxLength={1}
                disabled={disabled}
                onChange={(e) => {
                  onChange(applyBindingSwap(keyBindings, idx, e.target.value));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") return;
                  if (e.key === "Backspace" || e.key === "Delete") {
                    e.preventDefault();
                    onChange({
                      ...keyBindings,
                      [idx]: "",
                    });
                    return;
                  }
                  if (e.key.length !== 1) return;
                  e.preventDefault();
                  onChange(applyBindingSwap(keyBindings, idx, e.key));
                }}
                className="h-10 w-14 rounded-lg border border-slate-600 bg-slate-900/80 px-2 text-center text-lg font-black tracking-[0.08em] text-cyan-100 outline-none transition focus:border-cyan-400/70 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.18)] disabled:opacity-60"
              />
            </label>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-400">
        輸入新按鍵時若與其他槽位重複，系統會自動交換；按下
        <span className="px-1 text-slate-200">Backspace</span>或
        <span className="px-1 text-slate-200">Delete</span>
        可清空該槽位。
      </div>
    </div>
  );
};

export default KeyBindingSettings;
