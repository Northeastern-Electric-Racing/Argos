import { Segment } from './bms.utils';

export const enum AlphaThermReading {
  Therm0 = 0 * 2,
  Therm1 = 1 * 2,
  Therm2 = 2 * 2,
  Therm3 = 3 * 2,
  Therm4 = 4 * 2,
  Therm5 = 5 * 2,
  Therm6 = 6 * 2
}
export const allAlphaThermValues = [
  AlphaThermReading.Therm0,
  AlphaThermReading.Therm1,
  AlphaThermReading.Therm2,
  AlphaThermReading.Therm3,
  AlphaThermReading.Therm4,
  AlphaThermReading.Therm5,
  AlphaThermReading.Therm6
];

export const enum BetaThermReading {
  Therm0 = 0 * 2,
  Therm1 = 1 * 2,
  Therm2 = 2 * 2,
  Therm3 = 3 * 2,
  Therm4 = 4 * 2,
  Therm5 = 5 * 2
}
export const allBetaThermValues = [
  BetaThermReading.Therm0,
  BetaThermReading.Therm1,
  BetaThermReading.Therm2,
  BetaThermReading.Therm3,
  BetaThermReading.Therm4,
  BetaThermReading.Therm5
];

export enum BetaVoltReading {
  Cell0 = 0,
  Cell1 = 1,
  Cell2 = 2,
  Cell3 = 3,
  Cell4 = 4,
  Cell5 = 5,
  Cell6 = 6,
  Cell7 = 7,
  Cell8 = 8,
  Cell9 = 9,
  Cell10 = 10
}
export const allBetaVoltValues = [
  BetaVoltReading.Cell0,
  BetaVoltReading.Cell1,
  BetaVoltReading.Cell2,
  BetaVoltReading.Cell3,
  BetaVoltReading.Cell4,
  BetaVoltReading.Cell5,
  BetaVoltReading.Cell6,
  BetaVoltReading.Cell7,
  BetaVoltReading.Cell8,
  BetaVoltReading.Cell9,
  BetaVoltReading.Cell10
];
export enum AlphaVoltReading {
  Cell0 = 0,
  Cell1 = 1,
  Cell2 = 2,
  Cell3 = 3,
  Cell4 = 4,
  Cell5 = 5,
  Cell6 = 6,
  Cell7 = 7,
  Cell8 = 8,
  Cell9 = 9,
  Cell10 = 10,
  Cell11 = 11,
  Cell12 = 12,
  Cell13 = 13
}
export const allAlphaVoltValues = [
  AlphaVoltReading.Cell0,
  AlphaVoltReading.Cell1,
  AlphaVoltReading.Cell2,
  AlphaVoltReading.Cell3,
  AlphaVoltReading.Cell4,
  AlphaVoltReading.Cell5,
  AlphaVoltReading.Cell6,
  AlphaVoltReading.Cell7,
  AlphaVoltReading.Cell8,
  AlphaVoltReading.Cell9,
  AlphaVoltReading.Cell10,
  AlphaVoltReading.Cell11,
  AlphaVoltReading.Cell12,
  AlphaVoltReading.Cell13
];
export enum AlphaBurnReading {
  Cell0 = 0,
  Cell1 = 1,
  Cell2 = 2,
  Cell3 = 3,
  Cell4 = 4,
  Cell5 = 5,
  Cell6 = 6,
  Cell7 = 7,
  Cell8 = 8,
  Cell9 = 9,
  Cell10 = 10,
  Cell11 = 11,
  Cell12 = 12,
  Cell13 = 13
}
export const allAlphaBurnValues = [
  AlphaBurnReading.Cell0,
  AlphaBurnReading.Cell1,
  AlphaBurnReading.Cell2,
  AlphaBurnReading.Cell3,
  AlphaBurnReading.Cell4,
  AlphaBurnReading.Cell5,
  AlphaBurnReading.Cell6,
  AlphaBurnReading.Cell7,
  AlphaBurnReading.Cell8,
  AlphaBurnReading.Cell9,
  AlphaBurnReading.Cell10,
  AlphaBurnReading.Cell11,
  AlphaBurnReading.Cell12,
  AlphaBurnReading.Cell13
];

export enum BetaBurnReading {
  Cell0 = 0,
  Cell1 = 1,
  Cell2 = 2,
  Cell3 = 3,
  Cell4 = 4,
  Cell5 = 5,
  Cell6 = 6,
  Cell7 = 7,
  Cell8 = 8,
  Cell9 = 9,
  Cell10 = 10
}
export const allBetaBurnValues = [
  BetaBurnReading.Cell0,
  BetaBurnReading.Cell1,
  BetaBurnReading.Cell2,
  BetaBurnReading.Cell3,
  BetaBurnReading.Cell4,
  BetaBurnReading.Cell5,
  BetaBurnReading.Cell6,
  BetaBurnReading.Cell7,
  BetaBurnReading.Cell8,
  BetaBurnReading.Cell9,
  BetaBurnReading.Cell10
];

export const alphaTemp = (segment: Segment, cell: AlphaThermReading) => `BMS/PerCell/Alpha/${segment}/Therms/${cell}`;
export const betaTemp = (segment: Segment, cell: BetaThermReading) => `BMS/PerCell/Beta/${segment}/Therms/${cell}`;
export const alphaVolt = (segment: Segment, cell: AlphaVoltReading) => `BMS/PerCell/Alpha/${segment}/Volts/${cell}`;
export const betaVolt = (segment: Segment, cell: BetaVoltReading) => `BMS/PerCell/Beta/${segment}/Volts/${cell}`;
export const alphaBurning = (segment: Segment, cell: AlphaBurnReading) => `BMS/PerCell/Alpha/${segment}/Burning/${cell}`;
export const betaBurning = (segment: Segment, cell: BetaBurnReading) => `BMS/PerCell/Beta/${segment}/Burning/${cell}`;
export const segmentTemp = (segment: Segment) => `BMS/Segment_Temp/${segment}`;
export const perCellAlphaDieTemp = (segment: Segment) => `BMS/PerCell/Alpha/${segment}/DieTemp`;
export const perCellBetaDieTemp = (segment: Segment) => `BMS/PerCell/Beta/${segment}/DieTemp`;
export const segmentVoltage = (segment: Segment) => `BMS/Segment_Voltage/${segment}`;

export const dataTypes = {
  alphaTemp,
  betaTemp,
  alphaVolt,
  betaVolt,
  alphaBurning,
  betaBurning,
  segmentTemp,
  perCellAlphaDieTemp,
  perCellBetaDieTemp,
  segmentVoltage
};
