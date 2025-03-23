import { DataTypeEnum } from 'src/data-type.enum';

export enum Chips {
  Alpha = 0,
  Beta = 1
}

export enum Segments {
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

export const getSegmentInfo = (segmentNumber: Segments): SegmentInfo => {
  let segmentTempKey!: DataTypeEnum;
  let alphaChipTempKey!: DataTypeEnum;
  let betaChipTempKey!: DataTypeEnum;
  let voltageKey!: DataTypeEnum;

  switch (segmentNumber) {
    case Segments.Segment1:
      segmentTempKey = DataTypeEnum.Segment_Temp_1;
      alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_0;
      betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_0;
      voltageKey = DataTypeEnum.Segment_Voltage_1;
      break;
    case Segments.Segment2:
      segmentTempKey = DataTypeEnum.Segment_Temp_2;
      alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_1;
      betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_1;
      voltageKey = DataTypeEnum.Segment_Voltage_2;
      break;
    case Segments.Segment3:
      segmentTempKey = DataTypeEnum.Segment_Temp_3;
      alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_2;
      betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_2;
      voltageKey = DataTypeEnum.Segment_Voltage_3;
      break;
    case Segments.Segment4:
      segmentTempKey = DataTypeEnum.Segment_Temp_4;
      alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_3;
      betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_3;
      voltageKey = DataTypeEnum.Segment_Voltage_4;
      break;
    case Segments.Segment5:
      segmentTempKey = DataTypeEnum.Segment_Temp_5;
      alphaChipTempKey = DataTypeEnum.PER_CELL_ALPHA_DIE_TEMP_4;
      betaChipTempKey = DataTypeEnum.PER_CELL_BETA_DIE_TEMP_4;
      voltageKey = DataTypeEnum.Segment_Voltage_5;
      break;
  }
  return { segmentTempKey, alphaChipTempKey, betaChipTempKey, voltageKey };
};
