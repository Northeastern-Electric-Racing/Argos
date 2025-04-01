import { dataTypes } from './topic.utils';

export enum Chip {
  Alpha = 0,
  Beta = 1
}
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
  alphaChipTempKey: dataTypes.perCellAlphaDieTemp(Segment.Segment0),
  betaChipTempKey: dataTypes.perCellBetaDieTemp(Segment.Segment0),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment0)
};

export const segment1: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment1),
  alphaChipTempKey: dataTypes.perCellAlphaDieTemp(Segment.Segment1),
  betaChipTempKey: dataTypes.perCellBetaDieTemp(Segment.Segment1),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment1)
};

export const segment2: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment2),
  alphaChipTempKey: dataTypes.perCellAlphaDieTemp(Segment.Segment2),
  betaChipTempKey: dataTypes.perCellBetaDieTemp(Segment.Segment2),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment2)
};

export const segment3: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment3),
  alphaChipTempKey: dataTypes.perCellAlphaDieTemp(Segment.Segment3),
  betaChipTempKey: dataTypes.perCellBetaDieTemp(Segment.Segment3),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment3)
};

export const segment4: SegmentInfo = {
  segmentTempKey: dataTypes.segmentTemp(Segment.Segment4),
  alphaChipTempKey: dataTypes.perCellAlphaDieTemp(Segment.Segment4),
  betaChipTempKey: dataTypes.perCellBetaDieTemp(Segment.Segment4),
  voltageKey: dataTypes.segmentVoltage(Segment.Segment4)
};

export const segmentInfoMap = {
  [Segment.Segment0]: segment0,
  [Segment.Segment1]: segment1,
  [Segment.Segment2]: segment2,
  [Segment.Segment3]: segment3,
  [Segment.Segment4]: segment4
};
