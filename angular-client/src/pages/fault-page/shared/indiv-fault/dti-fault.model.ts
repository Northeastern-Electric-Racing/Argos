import { Node } from 'src/utils/types.utils';
import { DTIFaultType } from '../fault-type/dti-fault-type.model';
import { Fault } from './fault.model';

export enum DTI_FAULTS_VALUES {
  OVER_VOLTAGE = 1,
  UNDER_VOLTAGE = 2,
  DRV = 3,
  ABS_OVER_CURRENT = 4,
  CTLR_OVER_TEMP = 5,
  MOTOR_OVER_TEMP = 6,
  SENSOR_WIRE_FAULT = 7,
  SENSOR_GENERAL_FAULT = 8,
  CAN_COMMAND_ERROR = 9,
  ANALOG_INPUT_ERROR = 10
}

export class DTIFault implements Fault<DTIFaultType> {
  name: DTI_FAULTS_VALUES;
  timeTriggered: number;
  format(): { type: String; name: String; timeTriggered: number } {
    throw new Error('Method not implemented.');
  }
  /**
   * Constructs a new DTI fault base on a valid
   * @param faultValue
   * @param timeTriggered
   */
  constructor(faultValue: DTI_FAULTS_VALUES, timeTriggered: number) {
    this.name = faultValue;
    this.timeTriggered = timeTriggered;
  }
  getRelevantNodes(timeFrame: number): Node[] {
    throw new Error('Method not implemented.');
  }
}
