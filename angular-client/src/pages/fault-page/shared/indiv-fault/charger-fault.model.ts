import { Node } from 'src/utils/types.utils';
import { ChargerFaultType } from '../fault-type/charger-fault-type.model';
import { Fault } from './fault.model';

export enum CHARGER_FAULT_VALUES {
  COMM_TIMEOUT_FAULT = 'Comm Timeout',
  HARDWARE_FAILURE_FAULT = 'Hardware Failure',
  OVER_TEMP_FAULT = 'Over Temp',
  VOLTAGE_WRONG_FAULT = 'Voltage Wrong',
  WRONG_BAT_CONNECT_FAULT = 'Wrong Battery Connect'
}

export class ChargerFault implements Fault<ChargerFaultType> {
  name: CHARGER_FAULT_VALUES;
  timeTriggered: number;
  format(): { type: String; name: CHARGER_FAULT_VALUES; timeTriggered: number } {
    throw new Error('Method not implemented.');
  }
  /**
   * Constructs a new Charger fault base on a valid faultValue
   * @param faultValue
   * @param timeTriggered
   */
  constructor(faultValue: CHARGER_FAULT_VALUES, timeTriggered: number) {
    this.name = faultValue;
    this.timeTriggered = timeTriggered;
  }
  getRelevantNodes(timeFrame: number): Node[] {
    throw new Error('Method not implemented.');
  }
}
