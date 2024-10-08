import { Node } from 'src/utils/types.utils';
import { BMSFaultType } from '../fault-type/bms-fault-type.model';
import { Fault } from './fault.model';

export enum BMS_FAULTS_VALUES {
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

export class BMSFault implements Fault<BMSFaultType> {
  name: BMS_FAULTS_VALUES;
  timeTriggered: number;
  format(): { type: String; name: String; timeTriggered: number } {
    throw new Error('Method not implemented.');
  }
  /**
   * Constructs a new BMS fault base on a valid faultValue
   * @param faultValue
   * @param timeTriggered
   */
  constructor(faultValue: BMS_FAULTS_VALUES, timeTriggered: number) {
    this.name = faultValue;
    this.timeTriggered = timeTriggered;
  }
  getRelevantNodes(timeFrame: number): Node[] {
    throw new Error('Method not implemented.');
  }
}
