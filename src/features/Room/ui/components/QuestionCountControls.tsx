import React from "react";
import { Button, Stack, Typography } from "@mui/material";

interface QuestionCountControlsProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  compact?: boolean;
  showRangeHint?: boolean;
  showSummaryRow?: boolean;
  onChange: (nextValue: number) => void;
}

const QuestionCountControls: React.FC<QuestionCountControlsProps> = ({
  value,
  min,
  max,
  step = 5,
  disabled = false,
  compact = false,
  showRangeHint = true,
  showSummaryRow = true,
  onChange,
}) => {
  const safeMin = Math.min(min, max);
  const safeMax = max;
  const clampValue = (nextValue: number) =>
    Math.min(safeMax, Math.max(safeMin, nextValue));
  const adjust = (delta: number) => onChange(clampValue(value + delta));
  const rangeLabel = `${safeMin} - ${safeMax}`;

  if (compact) {
    return (
      <Stack
        spacing={1}
        className="room-question-controls room-question-controls--compact"
      >
        <div className="room-question-inline">
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => onChange(safeMin)}
            disabled={disabled || value === safeMin}
          >
            最小
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(-step)}
            disabled={disabled || value <= safeMin}
          >
            -{step}
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(-1)}
            disabled={disabled || value <= safeMin}
          >
            -1
          </Button>
          <div className="room-question-inline-pill">
            <span>題數</span>
            <strong>{value}</strong>
          </div>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(1)}
            disabled={disabled || value >= safeMax}
          >
            +1
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(step)}
            disabled={disabled || value >= safeMax}
          >
            +{step}
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => onChange(safeMax)}
            disabled={disabled || value === safeMax}
          >
            最大
          </Button>
        </div>
        {showRangeHint && (
          <Typography variant="caption" className="room-create-muted">
            可調範圍 {rangeLabel}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack
      spacing={1.2}
      className="room-question-controls room-question-controls--dialog"
    >
      {showSummaryRow ? (
        <div className="room-question-summary-row">
          {showRangeHint ? (
            <span className="room-question-summary-chip">題數範圍 {rangeLabel}</span>
          ) : (
            <span className="room-question-summary-chip">目前題數 {value}</span>
          )}
          <span className="room-question-summary-chip room-question-summary-chip--accent">
            快速調整 ±{step}
          </span>
        </div>
      ) : null}

      <div className="room-question-rail">
        <div className="room-question-action-cluster">
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => onChange(safeMin)}
            disabled={disabled || value === safeMin}
          >
            最小
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(-step)}
            disabled={disabled || value <= safeMin}
          >
            -{step}
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(-1)}
            disabled={disabled || value <= safeMin}
          >
            -1
          </Button>
        </div>

        <div className="room-question-focus-card">
          <span className="room-question-focus-card__label">目前題數</span>
          <strong className="room-question-focus-card__value">{value}</strong>
          <span className="room-question-focus-card__range">
            最少 {safeMin} / 最多 {safeMax}
          </span>
        </div>

        <div className="room-question-action-cluster">
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(1)}
            disabled={disabled || value >= safeMax}
          >
            +1
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => adjust(step)}
            disabled={disabled || value >= safeMax}
          >
            +{step}
          </Button>
          <Button
            variant="outlined"
            size="small"
            className="room-create-accent-button"
            onClick={() => onChange(safeMax)}
            disabled={disabled || value === safeMax}
          >
            最大
          </Button>
        </div>
      </div>
    </Stack>
  );
};

export default QuestionCountControls;
