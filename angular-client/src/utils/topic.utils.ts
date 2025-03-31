import { Segment } from './bms.utils';

export const enum AlphaTherm {
  Therm0 = 0 * 2,
  Therm1 = 1 * 2,
  Therm2 = 2 * 2,
  Therm3 = 3 * 2,
  Therm4 = 4 * 2,
  Therm5 = 5 * 2,
  Therm6 = 6 * 2
}
export const allAlphaThermValues = [
  AlphaTherm.Therm0,
  AlphaTherm.Therm1,
  AlphaTherm.Therm2,
  AlphaTherm.Therm3,
  AlphaTherm.Therm4,
  AlphaTherm.Therm5,
  AlphaTherm.Therm6
];

export const enum BetaTherms {
  Therm0 = 0 * 2,
  Therm1 = 1 * 2,
  Therm2 = 2 * 2,
  Therm3 = 3 * 2,
  Therm4 = 4 * 2,
  Therm5 = 5 * 2
}
export const allBetaThermValues = [
  BetaTherms.Therm0,
  BetaTherms.Therm1,
  BetaTherms.Therm2,
  BetaTherms.Therm3,
  BetaTherms.Therm4,
  BetaTherms.Therm5
];

export enum BetaCellReadings {
  Cell0 = 0 * 2,
  Cell1 = 1 * 2,
  Cell2 = 2 * 2,
  Cell3 = 3 * 2,
  Cell4 = 4 * 2,
  Cell5 = 5 * 2,
  Cell6 = 6 * 2,
  Cell7 = 7 * 2,
  Cell8 = 8 * 2,
  Cell9 = 9 * 2,
  Cell10 = 10 * 2
}
export enum AlphaCellsReadings {
  Cell0 = 0 * 2,
  Cell1 = 1 * 2,
  Cell2 = 2 * 2,
  Cell3 = 3 * 2,
  Cell4 = 4 * 2,
  Cell5 = 5 * 2,
  Cell6 = 6 * 2,
  Cell7 = 7 * 2,
  Cell8 = 8 * 2,
  Cell9 = 9 * 2,
  Cell10 = 10 * 2,
  Cell11 = 11 * 2,
  Cell12 = 12 * 2,
  Cell13 = 13 * 2
}

export const alphaTemp = (segment: Segment, therm: AlphaTherm) => `BMS/PerCell/Alpha/${segment}/Therms/${therm}`;
export const betaTemp = (segment: Segment, therm: BetaTherms) => `BMS/PerCell/Beta/${segment}/Therms/${therm}`;
export const alphaVoltage = (segment: Segment, cell: AlphaCellsReadings) => `BMS/PerCell/Alpha/${segment}/Volts/${cell}`;
export const betaVoltage = (segment: Segment, cell: BetaCellReadings) => `BMS/PerCell/Beta/${segment}/Volts/${cell}`;
export const alphaBurning = (segment: Segment, cell: AlphaCellsReadings) => `BMS/PerCell/Alpha/${segment}/Burning/${cell}`;
export const betaBurning = (segment: Segment, cell: BetaCellReadings) => `BMS/PerCell/Beta/${segment}/Burning/${cell}`;
export const segmentTemp = (segment: Segment) => `BMS/Segment_Temp/${segment}`;
export const perCellAlphaDieTemp = (segment: Segment) => `BMS/PerCell/Alpha/${segment}/DieTemp`;
export const perCellBetaDieTemp = (segment: Segment) => `BMS/PerCell/Beta/${segment}/DieTemp`;
export const segmentVoltage = (segment: Segment) => `BMS/Segment_Voltage/${segment}`;

export const dataTypes = {
  alphaTemp,
  betaTemp,
  alphaVoltage,
  betaVoltage,
  alphaBurning,
  betaBurning,
  segmentTemp,
  perCellAlphaDieTemp,
  perCellBetaDieTemp,
  segmentVoltage
};
