import { FaultTypeModel } from '../fault-type/fault-type.model';

export interface Fault<T extends FaultTypeModel> {
  name: String;
  timeTriggered: number;
  format(): { type: String; name: String; timeTriggered: number };
}

export type AllFaultEnums = BMS_FAULTS_VALUES;

enum BMS_FAULTS_VALUES {
  CELLS_NOT_BALANCING = 1,
  CELL_VOLTAGE_TOO_LOW = 2,
  CELL_VOLTAGE_TOO_HIGH = 4,
  PACK_TOO_HOT = 8,
  OPEN_WIRING_FAULT = 16,
  INTERNAL_SOFTWARE_FAULT = 32,
  INTERNAL_THERMAL_ERROR = 64,
  INTERNAL_CELL_COMM_FAULT = 128,
  CURRENT_SENSOR_FAULT = 256,
  CHARGE_READING_MISMATCH = 512,
  LOW_CELL_VOLTAGE = 1024,
  WEAK_PACK_FAULT = 2048,
  EXTERNAL_CAN_FAULT = 4096,
  DISCHARGE_LIMIT_ENFORCEMENT_FAULT = 8192,
  CHARGER_SAFETY_RELAY = 16384,
  BATTERY_THERMISTOR = 32768,
  CHARGER_CAN_FAULT = 65536,
  CHARGER_LIMIT_ENFORCEMENT_FAULT = 131072
}

enum CHARGER_FAULT_VALUES {
  COMM_TIMEOUT_FAULT = 'Comm Timeout',
  HARDWARE_FAILURE_FAULT = 'Hardware Failure',
  OVER_TEMP_FAULT = 'Over Temp',
  VOLTAGE_WRONG_FAULT = 'Voltage Wrong',
  WRONG_BAT_CONNECT_FAULT = 'Wrong Battery Connect'
}
