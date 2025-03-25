import { DataTypeEnum } from 'src/data-type.enum';

export enum Chip {
  Alpha = 0,
  Beta = 1
}

export enum Segment {
  Segment1 = 1,
  Segment2 = 2,
  Segment3 = 3,
  Segment4 = 4,
  Segment5 = 5
}

export type SegmentInfo = {
  segmentTempKey: DataTypeEnum;
  alphaChipTempKey: DataTypeEnum;
  betaChipTempKey: DataTypeEnum;
  voltageKey: DataTypeEnum;
};

export const segment1: SegmentInfo = {
  segmentTempKey: DataTypeEnum.Segment_Temp_1,
  alphaChipTempKey: DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_0,
  betaChipTempKey: DataTypeEnum.PER_CELL_BETA_DIE_TEMP_0,
  voltageKey: DataTypeEnum.Segment_Voltage_1
};

export const segment2: SegmentInfo = {
  segmentTempKey: DataTypeEnum.Segment_Temp_2,
  alphaChipTempKey: DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_1,
  betaChipTempKey: DataTypeEnum.PER_CELL_BETA_DIE_TEMP_1,
  voltageKey: DataTypeEnum.Segment_Voltage_2
};

export const segment3: SegmentInfo = {
  segmentTempKey: DataTypeEnum.Segment_Temp_3,
  alphaChipTempKey: DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_2,
  betaChipTempKey: DataTypeEnum.PER_CELL_BETA_DIE_TEMP_2,
  voltageKey: DataTypeEnum.Segment_Voltage_3
};

export const segment4: SegmentInfo = {
  segmentTempKey: DataTypeEnum.Segment_Temp_4,
  alphaChipTempKey: DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_3,
  betaChipTempKey: DataTypeEnum.PER_CELL_BETA_DIE_TEMP_3,
  voltageKey: DataTypeEnum.Segment_Voltage_4
};

export const segment5: SegmentInfo = {
  segmentTempKey: DataTypeEnum.Segment_Temp_5,
  alphaChipTempKey: DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_4,
  betaChipTempKey: DataTypeEnum.PER_CELL_BETA_DIE_TEMP_4,
  voltageKey: DataTypeEnum.Segment_Voltage_5
};

export const segmentInfoMap = new Map<Segment, SegmentInfo>([
  [Segment.Segment1, segment1],
  [Segment.Segment2, segment2],
  [Segment.Segment3, segment3],
  [Segment.Segment4, segment4],
  [Segment.Segment5, segment5]
]);
