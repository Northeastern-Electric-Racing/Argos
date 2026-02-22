import { topics } from './topic.utils';
export { BMS_CONFIG } from './bms.config';
import { BMS_CONFIG } from './bms.config';

export enum Chip {
  Alpha = 0,
  Beta = 1
}
export const chipToString = (chip: Chip, singleLetter = false): string => {
  switch (chip) {
    case Chip.Alpha:
      return singleLetter ? 'A' : 'Alpha';
    case Chip.Beta:
      return singleLetter ? 'B' : 'Beta';
    default:
      throw new Error('Invalid chip type ' + chip);
  }
};

/** Segment is a plain numeric index (0-based). */
export type Segment = number;

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
};

/** Dynamically generated map of segment index → SegmentInfo topic keys. */
export const segmentInfoMap: Record<Segment, SegmentInfo> = Object.fromEntries(
  allSegments.map((seg) => [
    seg,
    {
      segmentTempKey: topics.segmentTemp(seg),
      alphaChipTempKey: topics.dieTemp(seg, Chip.Alpha),
      betaChipTempKey: topics.dieTemp(seg, Chip.Beta),
      voltageKey: topics.segmentVoltage(seg)
    }
  ])
);

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
