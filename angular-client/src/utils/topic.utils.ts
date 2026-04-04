import { BMS_CONFIG } from './bms.config';
import { Chip, chipToString, Segment } from './bms.utils';

// BMS
export const alphaTemp = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/Therms/${cell}`;
export const betaTemp = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/Therms/${cell}`;
export const alphaVolt = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/Volts/${cell}`;
export const betaVolt = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/Volts/${cell}`;
export const alphaBurning = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/Burning/${cell}`;
export const betaBurning = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/Burning/${cell}`;
export const alphaCvs = (segment: Segment, cell: number) => `BMS/PerCell/Alpha/${segment}/CvS/${cell}`;
export const betaCvs = (segment: Segment, cell: number) => `BMS/PerCell/Beta/${segment}/CvS/${cell}`;
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

// General
export const driver = () => `Driver`;
export const location = () => `Location`;
export const viewers = () => `Viewers`;
export const latency = () => `Old_Latency`;
export const newLatency = () => `Latency`;

// MPU
export const speed = () => `MPU/State/Speed`;
export const motorController = () => `MPU/Current/Motor_Controller`;
export const battboxFans = () => `MPU/Current/Battbox_Fans`;
export const pumps = () => `MPU/Current/Pumps`;
export const lvBoards = () => `MPU/Current/LV_Boards`;

// DTI
export const motorTemp = () => `DTI/Temps/Motor_Temperature`;

// TPU
export const cpuUsage = () => `TPU/OnBoard/CpuUsage`;
export const cpuTemp = () => `TPU/OnBoard/CpuTemp`;
export const ramUsage = () => `TPU/OnBoard/MemAvailable`;
export const wifiRSSI = () => `TPU/HaLow/RSSI`;
export const mcs = () => `TPU/HaLow/ApMCS`;
export const gpsLocation = () => `TPU/GPS/Location`;

// BMS Status / Pack
export const packTemp = () => `BMS/Status/Temp_Average`;
export const stateOfCharge = () => `BMS/Pack/SOC`;
export const current = () => `BMS/Charging/Current`;
export const chargeCurrentLimit = () => `BMS/Pack/CCL`;
export const dischargeCurrentLimit = () => `BMS/Pack/DCL`;
export const statusBalancing = () => `BMS/Status/Balancing`;
export const bmsMode = () => `BMS/Status/State`;
export const charging = () => `BMS/Charging/Control`;
export const packVoltage = () => `BMS/Pack/Voltage`;
export const cellUndervoltage = () => `BMS/Status/F/Cell_Undervoltage`;
export const cellOvervoltage = () => `BMS/Status/F/Cell_Overvoltage`;
export const cellsNotBalancing = () => `BMS/Status/F/Cells_Not_Balancing`;

// Charger Faults
export const commTimeoutFault = () => `Charger/Box/F_CommTimeout`;
export const hardwareFailureFault = () => `Charger/Box/F_HardwareFailure`;
export const overTempFault = () => `Charger/Box/F_OverTemp`;
export const overVoltageFault = () => `Charger/Box/F_OverVoltage`;
export const wrongBatConnectFault = () => `Charger/Box/F_WrongBatConnect`;

// BMS Faults
export const openWire = () => `BMS/Status/F/Open_Wire`;
export const chargerLimitEnforcementFault = () => `BMS/Status/F/CCL_Enforce`;
export const chargerCanFault = () => `BMS/Status/F/Charger_Can`;
export const batteryThermistor = () => `BMS/Status/F/Battery_Therm`;
export const chargerSafetyRelay = () => `BMS/Status/F/Charger_Safety`;
export const dischargeLimitEnforcementFault = () => `BMS/Status/F/DCL_Enforce`;
export const externalCanFault = () => `BMS/Status/F/External_Can`;
export const weakPackFault = () => `BMS/Status/F/Weak_Pack`;
export const lowCellVoltage = () => `BMS/Status/F/Low_Cell_Volts`;
export const chargeReadingMismatch = () => `BMS/Status/F/Charge_Reading`;
export const currentSensorFault = () => `BMS/Status/F/Current_Sense`;
export const internalCellCommFault = () => `BMS/Status/F/IC_Comm`;
export const internalThermalError = () => `BMS/Status/F/Thermal_Err`;
export const internalSoftwareFault = () => `BMS/Status/F/Software`;
export const packOverheat = () => `BMS/Status/F/Pack_Overheat`;

// Fake / Mock Data
export const motorUsage = () => `Motor Usage`;
export const coolingUsage = () => `Cooling Usage`;
export const steeringAngle = () => `Steering Angle`;
export const torque = () => `Torque`;
export const brakePressure = () => `Brake Pressure`;
export const acceleration = () => `Acceleration`;
export const xyzAcceleration = () => `XYZAcceleration`;

// BMS Debug / Per Cell
export const perCellOverflowId = () => `BMS/PerCell/OverflowID`;

export const topics = {
  alphaTemp,
  betaTemp,
  alphaVolt,
  betaVolt,
  alphaBurning,
  betaBurning,
  alphaCvs,
  betaCvs,
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
  msgsPerSecond,
  driver,
  location,
  viewers,
  latency,
  newLatency,
  speed,
  motorController,
  battboxFans,
  pumps,
  lvBoards,
  motorTemp,
  cpuUsage,
  cpuTemp,
  ramUsage,
  wifiRSSI,
  mcs,
  gpsLocation,
  packTemp,
  stateOfCharge,
  current,
  chargeCurrentLimit,
  dischargeCurrentLimit,
  statusBalancing,
  bmsMode,
  charging,
  packVoltage,
  cellUndervoltage,
  cellOvervoltage,
  cellsNotBalancing,
  commTimeoutFault,
  hardwareFailureFault,
  overTempFault,
  overVoltageFault,
  wrongBatConnectFault,
  openWire,
  chargerLimitEnforcementFault,
  chargerCanFault,
  batteryThermistor,
  chargerSafetyRelay,
  dischargeLimitEnforcementFault,
  externalCanFault,
  weakPackFault,
  lowCellVoltage,
  chargeReadingMismatch,
  currentSensorFault,
  internalCellCommFault,
  internalThermalError,
  internalSoftwareFault,
  packOverheat,
  perCellOverflowId,
  motorUsage,
  coolingUsage,
  steeringAngle,
  torque,
  brakePressure,
  acceleration,
  xyzAcceleration
};

/* Dynamically generated cell-index arrays derived from BMS_CONFIG */
export const allAlphaThermValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_THERM_COUNT }, (_, i) => i * 2);
export const allBetaThermValues: number[] = Array.from({ length: BMS_CONFIG.BETA_THERM_COUNT }, (_, i) => i * 2);
export const allAlphaVoltValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_VOLT_COUNT }, (_, i) => i);
export const allBetaVoltValues: number[] = Array.from({ length: BMS_CONFIG.BETA_VOLT_COUNT }, (_, i) => i);
export const allAlphaBurnValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_BURN_COUNT }, (_, i) => i);
export const allBetaBurnValues: number[] = Array.from({ length: BMS_CONFIG.BETA_BURN_COUNT }, (_, i) => i);
export const allAlphaCvsValues: number[] = Array.from({ length: BMS_CONFIG.ALPHA_CVS_COUNT }, (_, i) => i);
export const allBetaCvsValues: number[] = Array.from({ length: BMS_CONFIG.BETA_CVS_COUNT }, (_, i) => i);

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
