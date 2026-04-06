export type SfxPresetId = "arcade" | "focus" | "soft";

export type GameSfxEvent =
  | "countdown"
  | "countdownFinal"
  | "urgency"
  | "deadlineTick"
  | "deadlineFinal"
  | "go"
  | "lock"
  | "reveal"
  | "combo"
  | "comboTier1"
  | "comboTier2"
  | "comboTier3"
  | "comboTier4"
  | "comboTier5"
  | "comboBreak"
  | "correct"
  | "correctCombo1"
  | "correctCombo2"
  | "correctCombo3"
  | "correctCombo4"
  | "correctCombo5"
  | "wrong"
  | "unanswered";

type SfxStep = {
  atSec: number;
  durationSec: number;
  freq: number;
  endFreq?: number;
  gain: number;
  type: OscillatorType;
};

type SfxPresetProfile = {
  id: SfxPresetId;
  label: string;
  hint: string;
  pitchMul: number;
  gainMul: number;
  primaryWave: OscillatorType;
  accentWave: OscillatorType;
  softWave: OscillatorType;
};

const SFX_PRESET_PROFILES: Record<SfxPresetId, SfxPresetProfile> = {
  arcade: {
    id: "arcade",
    label: "Arcade",
    hint: "銳利、搶答感強",
    pitchMul: 1,
    gainMul: 1,
    primaryWave: "square",
    accentWave: "triangle",
    softWave: "sine",
  },
  focus: {
    id: "focus",
    label: "Focus",
    hint: "乾淨提示音",
    pitchMul: 0.95,
    gainMul: 0.9,
    primaryWave: "triangle",
    accentWave: "sine",
    softWave: "sine",
  },
  soft: {
    id: "soft",
    label: "Soft",
    hint: "較柔和、不刺耳",
    pitchMul: 0.9,
    gainMul: 0.75,
    primaryWave: "sine",
    accentWave: "triangle",
    softWave: "sine",
  },
};

export const parseStoredSfxPreset = (value: string | null): SfxPresetId => {
  if (value === "arcade" || value === "focus" || value === "soft") {
    return value;
  }
  return "arcade";
};

export const resolveCountdownSfxEvent = (
  countdownSec: number,
): GameSfxEvent => {
  if (countdownSec <= 1) return "countdownFinal";
  if (countdownSec === 2) return "urgency";
  return "countdown";
};

export const resolveGuessDeadlineSfxEvent = (
  countdownSec: number,
): GameSfxEvent => {
  if (countdownSec <= 1) return "deadlineFinal";
  return "deadlineTick";
};

export const resolveCorrectResultSfxEvent = (
  comboBonusPoints: number | null | undefined,
): GameSfxEvent => {
  const comboBonus = Number.isFinite(comboBonusPoints)
    ? Math.max(0, Math.floor(comboBonusPoints ?? 0))
    : 0;
  if (comboBonus <= 0) return "correct";
  const tier = Math.max(1, Math.min(5, Math.ceil(comboBonus / 4)));
  return `correctCombo${tier}` as GameSfxEvent;
};

export const resolveComboMilestoneSfxEvent = (
  comboTier: number | null | undefined,
): GameSfxEvent => {
  const safeTier = Number.isFinite(comboTier)
    ? Math.max(0, Math.floor(comboTier ?? 0))
    : 0;
  if (safeTier <= 0) return "combo";
  const audioTier = Math.max(1, Math.min(5, Math.ceil(safeTier / 2)));
  return `comboTier${audioTier}` as GameSfxEvent;
};

const buildCorrectComboTierSteps = (
  preset: SfxPresetProfile,
  tier: number,
): SfxStep[] => {
  const clampedTier = Math.max(1, Math.min(5, Math.floor(tier)));
  const p = (freq: number) => Math.max(40, freq * preset.pitchMul);
  const g = (gain: number) => Math.max(0.0001, gain * preset.gainMul);
  const lift = (clampedTier - 1) * 34;
  const sparkleGain = 0.065 + clampedTier * 0.006;
  const steps: SfxStep[] = [
    {
      atSec: 0,
      durationSec: 0.06,
      freq: p(820 + lift * 0.45),
      endFreq: p(940 + lift * 0.55),
      gain: g(0.095),
      type: preset.accentWave,
    },
    {
      atSec: 0.045,
      durationSec: 0.075,
      freq: p(1040 + lift * 0.65),
      endFreq: p(1260 + lift * 0.75),
      gain: g(0.09),
      type: preset.primaryWave,
    },
    {
      atSec: 0.105,
      durationSec: 0.07,
      freq: p(1320 + lift * 0.85),
      endFreq: p(1500 + lift),
      gain: g(0.082),
      type: preset.softWave,
    },
  ];

  if (clampedTier >= 2) {
    steps.push({
      atSec: 0.155,
      durationSec: 0.06,
      freq: p(1520 + lift),
      endFreq: p(1700 + lift * 1.1),
      gain: g(sparkleGain),
      type: preset.accentWave,
    });
  }

  if (clampedTier >= 4) {
    steps.push({
      atSec: 0.205,
      durationSec: 0.055,
      freq: p(1760 + lift * 1.05),
      endFreq: p(1940 + lift * 1.15),
      gain: g(sparkleGain - 0.008),
      type: preset.softWave,
    });
  }

  if (clampedTier >= 5) {
    steps.push({
      atSec: 0.252,
      durationSec: 0.07,
      freq: p(1880 + lift * 1.1),
      endFreq: p(2240 + lift * 1.25),
      gain: g(0.06),
      type: preset.primaryWave,
    });
  }

  return steps;
};

const buildComboMilestoneSteps = (
  preset: SfxPresetProfile,
  tier: number,
): SfxStep[] => {
  const clampedTier = Math.max(1, Math.min(5, Math.floor(tier)));
  const p = (freq: number) => Math.max(40, freq * preset.pitchMul);
  const g = (gain: number) => Math.max(0.0001, gain * preset.gainMul);
  const lift = (clampedTier - 1) * 54;

  const steps: SfxStep[] = [
    {
      atSec: 0,
      durationSec: 0.12,
      freq: p(320 + lift * 0.2),
      endFreq: p(420 + lift * 0.24),
      gain: g(0.075 + clampedTier * 0.008),
      type: preset.softWave,
    },
    {
      atSec: 0.016,
      durationSec: 0.074,
      freq: p(980 + lift * 0.44),
      endFreq: p(1180 + lift * 0.56),
      gain: g(0.132 + clampedTier * 0.007),
      type: preset.accentWave,
    },
    {
      atSec: 0.072,
      durationSec: 0.11,
      freq: p(1260 + lift * 0.64),
      endFreq: p(1540 + lift * 0.78),
      gain: g(0.128 + clampedTier * 0.008),
      type: preset.primaryWave,
    },
    {
      atSec: 0.15,
      durationSec: 0.12,
      freq: p(1560 + lift * 0.82),
      endFreq: p(1940 + lift),
      gain: g(0.11 + clampedTier * 0.01),
      type: preset.accentWave,
    },
  ];

  if (clampedTier >= 2) {
    steps.push({
      atSec: 0.196,
      durationSec: 0.16,
      freq: p(820 + lift * 0.3),
      endFreq: p(980 + lift * 0.42),
      gain: g(0.072),
      type: preset.softWave,
    });
  }

  if (clampedTier >= 3) {
    steps.push({
      atSec: 0.232,
      durationSec: 0.1,
      freq: p(1980 + lift),
      endFreq: p(2360 + lift * 1.1),
      gain: g(0.094),
      type: preset.primaryWave,
    });
  }

  if (clampedTier >= 4) {
    steps.push({
      atSec: 0.278,
      durationSec: 0.12,
      freq: p(2280 + lift * 1.04),
      endFreq: p(2760 + lift * 1.16),
      gain: g(0.084),
      type: preset.accentWave,
    });
  }

  if (clampedTier >= 5) {
    steps.push(
      {
        atSec: 0.052,
        durationSec: 0.24,
        freq: p(470 + lift * 0.26),
        endFreq: p(640 + lift * 0.28),
        gain: g(0.074),
        type: "triangle",
      },
      {
        atSec: 0.318,
        durationSec: 0.16,
        freq: p(2840 + lift * 1.1),
        endFreq: p(3420 + lift * 1.22),
        gain: g(0.078),
        type: preset.primaryWave,
      },
    );
  }

  return steps;
};

const getSfxSteps = (preset: SfxPresetProfile, event: GameSfxEvent): SfxStep[] => {
  const p = (freq: number) => Math.max(40, freq * preset.pitchMul);
  const g = (gain: number) => Math.max(0.0001, gain * preset.gainMul);
  switch (event) {
    case "countdown":
      return [
        {
          atSec: 0,
          durationSec: 0.08,
          freq: p(980),
          endFreq: p(920),
          gain: g(0.18),
          type: preset.accentWave,
        },
      ];
    case "countdownFinal":
      return [
        {
          atSec: 0,
          durationSec: 0.11,
          freq: p(1320),
          endFreq: p(1180),
          gain: g(0.22),
          type: preset.primaryWave,
        },
      ];
    case "urgency":
      return [
        {
          atSec: 0,
          durationSec: 0.06,
          freq: p(1180),
          endFreq: p(1240),
          gain: g(0.13),
          type: preset.primaryWave,
        },
      ];
    case "deadlineTick":
      return [
        {
          atSec: 0,
          durationSec: 0.045,
          freq: p(1180),
          endFreq: p(1260),
          gain: g(0.065),
          type: preset.accentWave,
        },
        {
          atSec: 0.04,
          durationSec: 0.05,
          freq: p(1320),
          endFreq: p(1420),
          gain: g(0.055),
          type: preset.softWave,
        },
      ];
    case "deadlineFinal":
      return [
        {
          atSec: 0,
          durationSec: 0.05,
          freq: p(1380),
          endFreq: p(1480),
          gain: g(0.075),
          type: preset.primaryWave,
        },
        {
          atSec: 0.045,
          durationSec: 0.06,
          freq: p(1560),
          endFreq: p(1680),
          gain: g(0.065),
          type: preset.accentWave,
        },
        {
          atSec: 0.11,
          durationSec: 0.04,
          freq: p(1320),
          endFreq: p(1180),
          gain: g(0.045),
          type: preset.softWave,
        },
      ];
    case "lock":
      return [
        {
          atSec: 0,
          durationSec: 0.048,
          freq: p(700),
          endFreq: p(840),
          gain: g(0.26),
          type: preset.accentWave,
        },
        {
          atSec: 0.032,
          durationSec: 0.052,
          freq: p(980),
          endFreq: p(1220),
          gain: g(0.2),
          type: preset.primaryWave,
        },
        {
          atSec: 0.09,
          durationSec: 0.09,
          freq: p(1360),
          endFreq: p(1720),
          gain: g(0.14),
          type: preset.softWave,
        },
      ];
    case "go":
      return [
        {
          atSec: 0,
          durationSec: 0.06,
          freq: p(760),
          endFreq: p(920),
          gain: g(0.12),
          type: preset.softWave,
        },
        {
          atSec: 0.045,
          durationSec: 0.09,
          freq: p(1040),
          endFreq: p(1360),
          gain: g(0.13),
          type: preset.accentWave,
        },
        {
          atSec: 0.11,
          durationSec: 0.08,
          freq: p(1480),
          endFreq: p(1680),
          gain: g(0.1),
          type: preset.primaryWave,
        },
      ];
    case "reveal":
      return [
        {
          atSec: 0,
          durationSec: 0.08,
          freq: p(520),
          endFreq: p(640),
          gain: g(0.11),
          type: preset.softWave,
        },
        {
          atSec: 0.06,
          durationSec: 0.12,
          freq: p(720),
          endFreq: p(980),
          gain: g(0.15),
          type: preset.accentWave,
        },
      ];
    case "combo":
      return [
        {
          atSec: 0,
          durationSec: 0.1,
          freq: p(420),
          endFreq: p(520),
          gain: g(0.068),
          type: preset.softWave,
        },
        {
          atSec: 0.012,
          durationSec: 0.058,
          freq: p(1020),
          endFreq: p(1180),
          gain: g(0.142),
          type: preset.accentWave,
        },
        {
          atSec: 0.062,
          durationSec: 0.082,
          freq: p(1320),
          endFreq: p(1580),
          gain: g(0.136),
          type: preset.primaryWave,
        },
        {
          atSec: 0.138,
          durationSec: 0.09,
          freq: p(1680),
          endFreq: p(2140),
          gain: g(0.122),
          type: preset.accentWave,
        },
        {
          atSec: 0.214,
          durationSec: 0.12,
          freq: p(2160),
          endFreq: p(2580),
          gain: g(0.094),
          type: preset.primaryWave,
        },
      ];
    case "comboTier1":
      return buildComboMilestoneSteps(preset, 1);
    case "comboTier2":
      return buildComboMilestoneSteps(preset, 2);
    case "comboTier3":
      return buildComboMilestoneSteps(preset, 3);
    case "comboTier4":
      return buildComboMilestoneSteps(preset, 4);
    case "comboTier5":
      return buildComboMilestoneSteps(preset, 5);
    case "comboBreak":
      return [
        {
          atSec: 0,
          durationSec: 0.06,
          freq: p(520),
          endFreq: p(390),
          gain: g(0.105),
          type: preset.primaryWave,
        },
        {
          atSec: 0.045,
          durationSec: 0.11,
          freq: p(360),
          endFreq: p(220),
          gain: g(0.105),
          type: "sawtooth",
        },
        {
          atSec: 0.13,
          durationSec: 0.11,
          freq: p(240),
          endFreq: p(170),
          gain: g(0.084),
          type: preset.softWave,
        },
      ];
    case "correct":
      return [
        {
          atSec: 0,
          durationSec: 0.08,
          freq: p(740),
          endFreq: p(880),
          gain: g(0.16),
          type: preset.accentWave,
        },
        {
          atSec: 0.07,
          durationSec: 0.1,
          freq: p(988),
          endFreq: p(1175),
          gain: g(0.14),
          type: preset.primaryWave,
        },
        {
          atSec: 0.14,
          durationSec: 0.14,
          freq: p(1318),
          endFreq: p(1480),
          gain: g(0.12),
          type: preset.softWave,
        },
      ];
    case "correctCombo1":
      return buildCorrectComboTierSteps(preset, 1);
    case "correctCombo2":
      return buildCorrectComboTierSteps(preset, 2);
    case "correctCombo3":
      return buildCorrectComboTierSteps(preset, 3);
    case "correctCombo4":
      return buildCorrectComboTierSteps(preset, 4);
    case "correctCombo5":
      return buildCorrectComboTierSteps(preset, 5);
    case "wrong":
      return [
        {
          atSec: 0,
          durationSec: 0.08,
          freq: p(540),
          endFreq: p(430),
          gain: g(0.16),
          type: preset.primaryWave,
        },
        {
          atSec: 0.07,
          durationSec: 0.15,
          freq: p(390),
          endFreq: p(230),
          gain: g(0.13),
          type: "sawtooth",
        },
        {
          atSec: 0.19,
          durationSec: 0.11,
          freq: p(280),
          endFreq: p(210),
          gain: g(0.085),
          type: preset.softWave,
        },
      ];
    case "unanswered":
      return [
        {
          atSec: 0,
          durationSec: 0.11,
          freq: p(430),
          endFreq: p(350),
          gain: g(0.09),
          type: preset.softWave,
        },
      ];
    default:
      return [];
  }
};

const scheduleSfxStep = (
  ctx: AudioContext,
  destination: AudioNode,
  baseTime: number,
  step: SfxStep,
) => {
  const startAt = baseTime + Math.max(0, step.atSec);
  const durationSec = Math.max(0.03, step.durationSec);
  const endAt = startAt + durationSec;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = step.type;
  osc.frequency.setValueAtTime(Math.max(1, step.freq), startAt);
  if (typeof step.endFreq === "number" && step.endFreq > 0) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, step.endFreq), endAt);
  }
  const peakGain = Math.max(0.0001, step.gain);
  const attackSec = Math.min(0.012, durationSec * 0.35);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.linearRampToValueAtTime(peakGain, startAt + attackSec);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);
  osc.connect(gainNode);
  gainNode.connect(destination);
  osc.start(startAt);
  osc.stop(endAt + 0.02);
};

export const playSynthSfx = (
  ctx: AudioContext,
  presetId: SfxPresetId,
  event: GameSfxEvent,
  volumeRatio: number,
  offsetSec = 0,
) => {
  const preset = SFX_PRESET_PROFILES[presetId];
  const steps = getSfxSteps(preset, event);
  if (steps.length === 0) return;

  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const limiter = ctx.createDynamicsCompressor();
  const baseTime = ctx.currentTime + Math.max(0, offsetSec);
  const safeVolume = Math.min(1, Math.max(0, volumeRatio));
  const isComboEvent =
    event === "combo" ||
    event === "comboTier1" ||
    event === "comboTier2" ||
    event === "comboTier3" ||
    event === "comboTier4" ||
    event === "comboTier5" ||
    event === "correctCombo1" ||
    event === "correctCombo2" ||
    event === "correctCombo3" ||
    event === "correctCombo4" ||
    event === "correctCombo5";
  const eventBoost =
    event === "lock"
      ? 1.08
      : event === "wrong" || event === "comboBreak"
        ? 1.12
        : isComboEvent
          ? 1.26
          : 1;
  const releaseSec =
    isComboEvent || event === "comboBreak"
      ? 0.88
      : event === "wrong"
        ? 0.66
        : 0.56;

  filter.type = "highpass";
  filter.frequency.setValueAtTime(90, baseTime);
  limiter.threshold.setValueAtTime(-16, baseTime);
  limiter.knee.setValueAtTime(10, baseTime);
  limiter.ratio.setValueAtTime(10, baseTime);
  limiter.attack.setValueAtTime(0.002, baseTime);
  limiter.release.setValueAtTime(0.06, baseTime);

  master.gain.setValueAtTime(0.0001, baseTime);
  master.gain.linearRampToValueAtTime(
    0.62 * safeVolume * eventBoost,
    baseTime + 0.01,
  );
  master.gain.exponentialRampToValueAtTime(0.0001, baseTime + releaseSec);

  master.connect(filter);
  filter.connect(limiter);
  limiter.connect(ctx.destination);

  steps.forEach((step) => {
    scheduleSfxStep(ctx, master, baseTime, step);
  });
};
