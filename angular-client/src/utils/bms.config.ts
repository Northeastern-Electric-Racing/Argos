/**
 * Central BMS configuration — change counts here to match the current accumulator.
 * All segment/cell arrays and topic subscriptions derive from these values.
 *
 * This file is intentionally free of imports to avoid circular dependency issues
 * between bms.utils.ts and topic.utils.ts.
 */
export const BMS_CONFIG = {
  NUM_SEGMENTS: 5,
  ALPHA_VOLT_COUNT: 26,
  BETA_VOLT_COUNT: 26,
  ALPHA_THERM_COUNT: 13,
  BETA_THERM_COUNT: 13,
  ALPHA_BURN_COUNT: 26,
  BETA_BURN_COUNT: 26
} as const;
