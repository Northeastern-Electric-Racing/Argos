/**
 * Central BMS configuration — change counts here to match the current accumulator.
 * All segment/cell arrays and topic subscriptions derive from these values.
 *
 * This file is intentionally free of imports to avoid circular dependency issues
 * between bms.utils.ts and topic.utils.ts.
 */
export const BMS_CONFIG = {
  NUM_SEGMENTS: 5,
  ALPHA_VOLT_COUNT: 13,
  BETA_VOLT_COUNT: 13,
  ALPHA_THERM_COUNT: 7,
  BETA_THERM_COUNT: 7,
  ALPHA_BURN_COUNT: 13,
  BETA_BURN_COUNT: 13,
  ALPHA_CVS_COUNT: 13,
  BETA_CVS_COUNT: 13
} as const;

/**
 * Cell voltage heatmap color scale (volts). Hue ramps red -> green from MIN to GOOD.
 * While charging, stays green up to CHARGE_WARN, then ramps rapidly back to red by
 * CHARGE_MAX (over-voltage).
 */
export const VOLT_COLOR_SCALE = {
  MIN: 3.0,
  GOOD: 3.6,
  CHARGE_WARN: 4.05,
  CHARGE_MAX: 4.15
} as const;

/**
 * Thermistor-to-cell mapping masks.
 *
 * Each entry maps one thermistor reading to the cell indices it covers.
 * Index in the array corresponds to the thermistor index (0-based),
 * and the value is the array of cell indices that receive that temperature.
 *
 * Example: therm 0 covers cells [0, 1], therm 6 covers only cell [12].
 */
export const ALPHA_THERM_CELL_MAP: number[][] = [
  [0, 1], // therm 0
  [2, 3], // therm 1
  [4, 5], // therm 2
  [6, 7], // therm 3
  [8, 9], // therm 4
  [10, 11], // therm 5
  [12] // therm 6 — no adjacent cell to share with
];

export const BETA_THERM_CELL_MAP: number[][] = [
  [0, 1], // therm 0
  [2, 3], // therm 1
  [4, 5], // therm 2
  [6, 7], // therm 3
  [8, 9], // therm 4
  [10, 11], // therm 5
  [12] // therm 6 — no adjacent cell to share with
];
