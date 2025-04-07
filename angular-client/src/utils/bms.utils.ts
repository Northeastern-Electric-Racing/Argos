import { dataTypes } from './topic.utils';

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
export enum Segment {
  Segment0 = 0,
  Segment1 = 1,
  Segment2 = 2,
  Segment3 = 3,
  Segment4 = 4
}
export const allSegments = [Segment.Segment0, Segment.Segment1, Segment.Segment2, Segment.Segment3, Segment.Segment4];
export const numToSegmentType = (segment: number): Segment => {
  const segmentType: Segment | undefined = segment as Segment;
  if (segmentType !== undefined) {
    return segmentType;
  }
  throw new Error('Invalid segment number ' + segment);
};

export type SegmentInfo = {
  segmentTempKey: string;
  alphaChipTempKey: string;
  betaChipTempKey: string;
  voltageKey: string;
};

export const segment0: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment0),
  alphaChipTempKey: dataTypes.dieTemp(Segment.Segment0, Chip.Alpha),
  betaChipTempKey: dataTypes.dieTemp(Segment.Segment0, Chip.Beta),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment0)
};

export const segment1: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment1),
  alphaChipTempKey: dataTypes.dieTemp(Segment.Segment1, Chip.Alpha),
  betaChipTempKey: dataTypes.dieTemp(Segment.Segment1, Chip.Beta),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment1)
};

export const segment2: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment2),
  alphaChipTempKey: dataTypes.dieTemp(Segment.Segment2, Chip.Alpha),
  betaChipTempKey: dataTypes.dieTemp(Segment.Segment2, Chip.Beta),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment2)
};

export const segment3: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment3),
  alphaChipTempKey: dataTypes.dieTemp(Segment.Segment3, Chip.Alpha),
  betaChipTempKey: dataTypes.dieTemp(Segment.Segment3, Chip.Beta),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment3)
};

export const segment4: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment4),
  alphaChipTempKey: dataTypes.dieTemp(Segment.Segment4, Chip.Alpha),
  betaChipTempKey: dataTypes.dieTemp(Segment.Segment4, Chip.Beta),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment4)
};

export const segmentInfoMap = {
  [Segment.Segment0]: segment0,
  [Segment.Segment1]: segment1,
  [Segment.Segment2]: segment2,
  [Segment.Segment3]: segment3,
  [Segment.Segment4]: segment4
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
