import { topics } from './topic.utils';
export { BMS_CONFIG } from './bms.config';
import { BMS_CONFIG } from './bms.config';
import { Chip, chipToString, Segment } from './bms.types';
export { Chip, chipToString } from './bms.types';
export type { Segment } from './bms.types';

export const allSegments: Segment[] = Array.from({ length: BMS_CONFIG.NUM_SEGMENTS }, (_, i) => i);

export const numToSegmentType = (segment: number): Segment => {
  if (segment >= 0 && segment < BMS_CONFIG.NUM_SEGMENTS) {
    return segment;
  }
  throw new Error('Invalid segment number ' + segment);
};

export type SegmentInfo = {
  segmentTempKey: string;
  alphaChipTempKey: string;
  betaChipTempKey: string;
  voltageKey: string;
  totalVoltageKey: string;
};

const segmentInfoCache = new Map<Segment, SegmentInfo>();

/**
 * SegmentInfo topic keys for a segment, computed lazily and memoised.
 */
export const segmentInfo = (seg: Segment): SegmentInfo => {
  let info = segmentInfoCache.get(seg);
  if (!info) {
    info = {
      segmentTempKey: topics.segmentTemp(seg),
      alphaChipTempKey: topics.dieTemp(seg, Chip.Alpha),
      betaChipTempKey: topics.dieTemp(seg, Chip.Beta),
      voltageKey: topics.segmentVoltage(seg),
      totalVoltageKey: topics.segmentTotalVoltage(seg)
    };
    segmentInfoCache.set(seg, info);
  }
  return info;
};

export const getConnectionDotStatusColor = (voltage: number): string => {
  if (voltage <= 375) {
    // multiply by 3 * 125 cells for scaling
    return 'red';
  }
  if (voltage <= 437.5) {
    // multiply by 3.5 * 125 cells for scaling
    return 'yellow';
  }
  // anything above 3.5 * 125 cells for scaling, is good
  return '#19ff30';
};

export const getCellVoltageStatusColor = (avgCellVoltage: number): string => {
  if (avgCellVoltage <= 3.0) return 'red';
  if (avgCellVoltage <= 3.5) return 'yellow';
  return '#19ff30';
};

export const getChipFromTopicValue = (chipValue: number): Chip => {
  return chipValue % 2 === 0 ? Chip.Alpha : Chip.Beta;
};

export const getCellChipLabel = (cell: number | undefined, chip: Chip | undefined): string => {
  const cellLabel = cell !== undefined ? `Cell: ${cell}` : 'No Cell';
  const chipLabel = chip !== undefined ? `Chip: ${chipToString(chip, true)}` : 'No Chip';
  return `${cellLabel} | ${chipLabel}`;
};
