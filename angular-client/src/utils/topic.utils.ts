import { BMS_CONFIG } from './bms.config';
import { Chip, chipToString, Segment } from './bms.utils';
import { CarCommand, CarCommandRow, DataType } from './types.utils';

// Group MQTT datatypes under the Calypso/Bidir namespace into per-command
// structures. Row label is the last topic segment; title is the one before.
export const groupCarCommands = (dataTypes: DataType[]): CarCommand[] => {
  const byTitle = new Map<string, CarCommandRow[]>();
  for (const dt of dataTypes) {
    if (!dt.name.startsWith('Calypso/Bidir/')) continue;
    const parts = dt.name.split('/');
    const title = parts[parts.length - 2];
    const rows = byTitle.get(title) ?? [];
    rows.push({ dataType: dt, label: parts[parts.length - 1] ?? '' });
    byTitle.set(title, rows);
  }
  return [...byTitle.entries()].map(([title, rows]) => ({ title, rows }));
};

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
// Argos/Message_Rate is a server-side synthetic topic — not stored in Scylla
// (absent from /datatypes) but still pushed live, so the header msgs/sec
// indicator keeps working. Left unchanged.
export const msgsPerSecond = () => 'Argos/Message_Rate';
// BMS/PerChip/* branch was removed from the CAN schema; no replacement topic
// found for per-chip PEC error count. Left as-is pending a new source.
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
// NOTE: The five topics below are not found in /datatypes (not stored in Scylla)
// but are still published as live MQTT/client-side values, so their string values
// are left unchanged. `latency`/`newLatency` are produced client-side by
// socket.service; `driver`/`location`/`viewers` come from the Argos server itself.
export const driver = () => `Driver`;
export const location = () => `Location`;
export const viewers = () => `Viewers`;
export const latency = () => `Old_Latency`;
export const newLatency = () => `Latency`;

// VCU
export const speed = () => `VCU/CarState/speed`;
// The MPU/Current/* topics were removed when load-current sensing moved off the MPU
// onto the VCU eFuse boards. The replacement topics below are picked from the
// current VCU/eFuses/*/Current set that appears in the live /datatypes list.
export const motorController = () => `VCU/eFuses/MC/Current`; // was MPU/Current/Motor_Controller; MC eFuse reading
export const battboxFans = () => `VCU/eFuses/Fanbatt/Current`; // was MPU/Current/Battbox_Fans; fanbatt eFuse reading
export const pumps = () => `VCU/eFuses/PumpOne/Current`; // was MPU/Current/Pumps; pumps are now two separate eFuses (PumpOne/PumpTwo), only PumpOne is wired here
export const lvBoards = () => `VCU/eFuses/LV/Current`; // was MPU/Current/LV_Boards; LV eFuse reading
// Pedals are now published as raw channel voltages instead of the old PSI-derived
// Brake_Front/Brake_Back names (see VCU/Pedals/Voltages/* in /datatypes).
export const brakePressureFront = () => `VCU/Pedals/Voltages/brake_1`; // was VCU/Pedals/PSI/Brake_Front
export const brakePressureBack = () => `VCU/Pedals/Voltages/brake_2`; // was VCU/Pedals/PSI/Brake_Back

// DTI
export const motorTemp = () => `DTI/Temps/Motor_Temperature`;

// TPU
// NOTE: The entire TPU/* namespace is absent from the current /datatypes list;
// it appears the Raspberry-Pi telemetry feed (CPU/RAM/Wi-Fi/GPS) is no longer
// wired through. Strings left in place because no replacement topics have been
// identified — the raspberry-pi, map, and related components will stay blank
// until a new topic source exists.
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
// BMS/Pack no longer publishes CCL/DCL in the current bms.json; the CCL/DCL
// values are now conveyed via BMS/Commands/Max_DC_{Brake_,}Current_Target
// (same topics aliased by accCCL/accDCL above).
export const chargeCurrentLimit = () => `BMS/Commands/Max_DC_Brake_Current_Target`; // was BMS/Pack/CCL
export const dischargeCurrentLimit = () => `BMS/Commands/Max_DC_Current_Target`; // was BMS/Pack/DCL
export const statusBalancing = () => `BMS/Status/Balancing`;
export const bmsMode = () => `BMS/Status/State`;
export const charging = () => `BMS/Charging/Control`;
export const packVoltage = () => `BMS/Pack/Voltage`;
// BMS faults were moved out of BMS/Status/F/* into BMS/Faults/Critical/* — the
// old Status/F branch no longer exists in /datatypes. Leaf names are unchanged.
export const cellUndervoltage = () => `BMS/Faults/Critical/Cell_Undervoltage`; // was BMS/Status/F/Cell_Undervoltage
export const cellOvervoltage = () => `BMS/Faults/Critical/Cell_Overvoltage`; // was BMS/Status/F/Cell_Overvoltage
export const cellsNotBalancing = () => `BMS/Faults/Critical/Cells_Not_Balancing`; // was BMS/Status/F/Cells_Not_Balancing

// Charger Faults
export const commTimeoutFault = () => `Charger/Box/F_CommTimeout`;
export const hardwareFailureFault = () => `Charger/Box/F_HardwareFailure`;
export const overTempFault = () => `Charger/Box/F_OverTemp`;
// charger.json renamed F_OverVoltage → F_VoltageWrong and F_WrongBatConnect → F_WrongBatConnection.
export const overVoltageFault = () => `Charger/Box/F_VoltageWrong`; // was Charger/Box/F_OverVoltage
export const wrongBatConnectFault = () => `Charger/Box/F_WrongBatConnection`; // was Charger/Box/F_WrongBatConnect

// BMS Faults
// All BMS faults moved from BMS/Status/F/* to BMS/Faults/Critical/* — see the
// Cell_Undervoltage/Overvoltage/NotBalancing block above for the same rename.
// Leaf names unchanged.
export const openWire = () => `BMS/Faults/Critical/Open_Wire`; // was BMS/Status/F/Open_Wire
export const chargerLimitEnforcementFault = () => `BMS/Faults/Critical/CCL_Enforce`; // was BMS/Status/F/CCL_Enforce
export const chargerCanFault = () => `BMS/Faults/Critical/Charger_Can`; // was BMS/Status/F/Charger_Can
export const batteryThermistor = () => `BMS/Faults/Critical/Battery_Therm`; // was BMS/Status/F/Battery_Therm
export const chargerSafetyRelay = () => `BMS/Faults/Critical/Charger_Safety`; // was BMS/Status/F/Charger_Safety
export const dischargeLimitEnforcementFault = () => `BMS/Faults/Critical/DCL_Enforce`; // was BMS/Status/F/DCL_Enforce
export const externalCanFault = () => `BMS/Faults/Critical/External_Can`; // was BMS/Status/F/External_Can
export const weakPackFault = () => `BMS/Faults/Critical/Weak_Pack`; // was BMS/Status/F/Weak_Pack
export const lowCellVoltage = () => `BMS/Faults/Critical/Low_Cell_Volts`; // was BMS/Status/F/Low_Cell_Volts
export const chargeReadingMismatch = () => `BMS/Faults/Critical/Charge_Reading`; // was BMS/Status/F/Charge_Reading
export const currentSensorFault = () => `BMS/Faults/Critical/Current_Sense`; // was BMS/Status/F/Current_Sense
export const internalCellCommFault = () => `BMS/Faults/Critical/IC_Comm`; // was BMS/Status/F/IC_Comm
export const internalThermalError = () => `BMS/Faults/Critical/Thermal_Err`; // was BMS/Status/F/Thermal_Err
export const internalSoftwareFault = () => `BMS/Faults/Critical/Software`; // was BMS/Status/F/Software
export const packOverheat = () => `BMS/Faults/Critical/Pack_Overheat`; // was BMS/Status/F/Pack_Overheat

// Fake / Mock Data
// These placeholder names were never real CAN/MQTT topics; the widgets that
// consume them (motor-info, steering-angle-display, torque-display, accel
// graphs) still reference them but will remain blank until real source topics
// are identified. Leaving strings untouched.
export const motorUsage = () => `Motor Usage`;
export const coolingUsage = () => `Cooling Usage`;
export const steeringAngle = () => `Steering Angle`;
export const torque = () => `Torque`;
export const acceleration = () => `Acceleration`;
export const xyzAcceleration = () => `XYZAcceleration`;

// BMS Debug / Per Cell
// BMS/PerCell/OverflowID and BMS/PerChip/PECErrorChip no longer appear in
// /datatypes — the PerChip branch was removed and PerCell/OverflowID wasn't
// carried forward. No replacement identified; the bms-debug-page overflow and
// crc widgets will stay blank until a new source is wired in.
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
  brakePressureFront,
  brakePressureBack,
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
