export const alphaTemp = (segment: 0 | 1 | 2 | 3 | 4, therm: 0 | 1 | 2 | 3 | 4 | 5 | 6) =>
  `BMS/PerCell/Alpha/${segment}/Therms/${therm}`;

export const betaTemp = (segment: 0 | 1 | 2 | 3 | 4, therm: 0 | 1 | 2 | 3 | 4 | 5) =>
  `BMS/PerCell/Beta/${segment}/Therms/${therm}`;

export const alphaVoltage = (segment: 0 | 1 | 2 | 3 | 4, cell: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13) =>
  `BMS/PerCell/Alpha/${segment}/Volts/${cell}`;

export const betaVoltage = (segment: 0 | 1 | 2 | 3 | 4, cell: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) =>
  `BMS/PerCell/Beta/${segment}/Volts/${cell}`;

export const alphaBurning = (segment: 0 | 1 | 2 | 3 | 4, cell: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13) =>
  `BMS/PerCell/Alpha/${segment}/Burning/${cell}`;

export const betaBurning = (segment: 0 | 1 | 2 | 3 | 4, cell: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) =>
  `BMS/PerCell/Beta/${segment}/Burning/${cell}`;

export const dataTypes = { alphaTemp, betaTemp, alphaVoltage, betaVoltage, alphaBurning, betaBurning };
