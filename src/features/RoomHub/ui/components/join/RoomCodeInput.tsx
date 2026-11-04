import { useId, useState, type RefObject } from "react";
import { normalizeRoomCodeInput } from "../../roomsHubViewModels";
import "./roomCodeInput.css";

type Props = {
  id?: string;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  error: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function RoomCodeInput({ id, value, inputRef, error, loading, onChange, onSubmit }: Props) {
  const helpId = useId();
  const [selection, setSelection] = useState(0);
  return (
    <div className="room-code-field">
      <div className="room-code-control" data-error={Boolean(error)}>
        <div className="room-code-slots" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="room-code-slot" data-active={index === Math.min(selection, 5)}>
              {value[index] || <span className="room-code-empty">·</span>}
            </span>
          ))}
        </div>
        <input
          id={id}
          ref={inputRef}
          aria-label="輸入房間代碼"
          aria-describedby={helpId}
          aria-invalid={Boolean(error)}
          value={value}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onPointerDown={(event) => {
            event.preventDefault();
            const input = event.currentTarget;
            const bounds = input.getBoundingClientRect();
            const index = Math.min(value.length, 5, Math.max(0, Math.floor((event.clientX - bounds.left) / (bounds.width / 6))));
            input.focus();
            input.setSelectionRange(index, Math.min(index + 1, value.length));
            setSelection(index);
          }}
          onSelect={(event) => setSelection(event.currentTarget.selectionStart ?? value.length)}
          onChange={(event) => onChange(normalizeRoomCodeInput(event.target.value))}
          onPaste={(event) => {
            // Normalize the full clipboard before the browser's six-character limit.
            event.preventDefault();
            onChange(normalizeRoomCodeInput(event.clipboardData.getData("text")));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.length === 6 && !loading) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>
      <p id={helpId} className="room-code-help" role={error ? "alert" : undefined}>
        {error || (loading ? "正在查詢房間…" : "6 碼英數字，不需「-」，填滿即查詢")}
      </p>
    </div>
  );
}
