import { BMS_CONFIG } from './bms.config';
import { Chip, chipToString, Segment } from './bms.utils';

export const alphaTemp = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/Therms/${cell}`;
export const betaTemp = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/Therms/${cell}`;
export const alphaVolt = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/Volts/${cell}`;
export const betaVolt = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/Volts/${cell}`;
export const alphaBurning = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/Burning/${cell}`;
export const betaBurning = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/Burning/${cell}`;
export const segmentTemp = (segment: Segment) => `BMS/Segment_Temp/${segment}`;
export const segmentVoltage = (segment: Segment) => `BMS/Segment_Volt/${segment}`;
export const segmentTotalVoltage = (segment: Segment) => `BMS/Segment_Total_Volt/${segment}`;
export const vref = (segment: Segment, chip: Chip) => `BMS/PerCell/${chipToString(chip)}/${segment}/Vref2`;
export const vres = (segment: Segment, chip: Chip) => `BMS/PerCell/${chipToString(chip)}/${segment}/Vres`;
export const vAnalog = (segment: Segment, chip: Chip) => `BMS/PerCell/${chipToString(chip)}/${segment}/Vanalog`;
export const vDigital = (segment: Segment, chip: Chip) => `BMS/PerCell/${chipToString(chip)}/${segment}/Vdigital`;
export const boardTemp = (segment: Segment, chip: Chip) => `BMS/PerCell/${chipToString(chip)}/${segment}/SegTemp`;
export const dieTemp = (segment: Segment, chip: Chip) => `BMS/PerCell/${chipToString(chip)}/${segment}/DieTemp`;
export const chipFault = (segment: Segment, chip: Chip, fault: ChipFault) =>
  `BMS/PerCell/${chipToString(chip)}/${segment}/Faults/${fault}`;
export const accCCL = () => `BMS/Commands/Max_DC_Brake_Current_Target`;
export const accDCL = () => `BMS/Commands/Max_DC_Current_Target`;
export const msgsPerSecond = () => 'Argos/Message_Rate';
export const pecErrorChip = () => `BMS/PerChip/PECErrorChip`;
export const highVoltsChip = () => `BMS/Cells/Volts_High_Chip`;
export const highVoltsCell = () => `BMS/Cells/Volts_High_Cell`;
export const highVoltsValue = () => `BMS/Cells/Volts_High_Value`;
export const lowVoltsChip = () => `BMS/Cells/Volts_Low_Chip`;
export const lowVoltsValue = () => `BMS/Cells/Volts_Low_Value`;
export const lowVoltsCell = () => `BMS/Cells/Volts_Low_Cell`;
export const voltsAvgValue = () => `BMS/Cells/Volts_Avg_Value`;
export const highTempValue = () => `BMS/Cells/Temp_High_Value`;
export const highTempChip = () => `BMS/Cells/Temp_High_Chip`;
export const highTempCell = () => `BMS/Cells/Temp_High_Cell`;
export const lowTempValue = () => `BMS/Cells/Temp_Low_Value`;
export const lowTempChip = () => `BMS/Cells/Temp_Low_Chip`;
export const lowTempCell = () => `BMS/Cells/Temp_Low_Cell`;
export const tempAvgValue = () => `BMS/Cells/Temp_Avg_Value`;

export const topics = {
  alphaTemp,
  betaTemp,
  alphaVolt,
  betaVolt,
  alphaBurning,
  betaBurning,
  segmentTemp,
  segmentVoltage,
  segmentTotalVoltage,
  vref,
  vres,
  vAnalog,
  vDigital,
  boardTemp,
  dieTemp,
  chipFault,
  pecErrorChip,
  highVoltsCell,
  highVoltsChip,
  highVoltsValue,
  lowVoltsCell,
  lowVoltsChip,
  lowVoltsValue,
  voltsAvgValue,
  highTempCell,
  highTempChip,
  highTempValue,
  lowTempCell,
  lowTempChip,
  lowTempValue,
  tempAvgValue,
  accCCL,
  accDCL,
  msgsPerSecond
};

/* Dynamically generated cell-index arrays derived from BMS_CONFIG */
export const allAlphaThermValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_THERM_COUNT }, (_, i) => i * 2);
export const allBetaThermValues: number[] = Array.from({ length: BMS_CONFIG.BETA_THERM_COUNT }, (_, i) => i * 2);
export const allAlphaVoltValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_VOLT_COUNT }, (_, i) => i);
export const allBetaVoltValues: number[] = Array.from({ length: BMS_CONFIG.BETA_VOLT_COUNT }, (_, i) => i);
export const allAlphaBurnValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_BURN_COUNT }, (_, i) => i);
export const allBetaBurnValues: number[] = Array.from({ length: BMS_CONFIG.BETA_BURN_COUNT }, (_, i) => i);

export enum ChipFault {
  VA_OV = 'VA_OV',
  VA_UV = 'VA_UV',
  VD_OV = 'VD_OV',
  VD_UV = 'VD_UV',
  VDE = 'VDE',
  VDEL = 'VDEL',
  SPI = 'SPI',
  SLEEP = 'SLEEP',
  THSD = 'THSD',
  TMOD_CHCK = 'TMOD_CHCK',
  OSC_CHCK = 'OSC_CHCK',
  OTP1 = 'OTP1',
  OTP2 = 'OTP2'
}
export const allChipFaults = [
  ChipFault.VA_OV,
  ChipFault.VA_UV,
  ChipFault.VD_OV,
  ChipFault.VD_UV,
  ChipFault.VDE,
  ChipFault.VDEL,
  ChipFault.SPI,
  ChipFault.SLEEP,
  ChipFault.THSD,
  ChipFault.TMOD_CHCK,
  ChipFault.OSC_CHCK,
  ChipFault.OTP1,
  ChipFault.OTP2
];
