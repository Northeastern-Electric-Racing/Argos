import { Node } from 'src/utils/types.utils';
import { DTIFaultType } from '../fault-type/dti-fault-type.model';
import { Fault } from './fault.model';
import { MPUFaultType } from '../fault-type/mpu-fault-type.model';

export enum MPU_FAULTS_VALUES {
  ONBOARD_TEMP_FAULT = 1,
  ONBOARD_PEDAL_FAULT = 2,
  IMU_FAULT = 4,
  CAN_DISPATCH_FAULT = 8,
  CAN_ROUTING_FAULT = 16,
  FUSE_MONITOR_FAULT = 32,
  SHUTDOWN_MONITOR_FAULT = 64,
  DTI_ROUTING_FAULT = 128,
  STEERINGIO_ROUTING_FAULT = 256,
  STATE_RECEIVED_FAULT = 512,
  INVALID_TRANSITION_FAULT = 1024,
  BMS_CAN_MONITOR_FAULT = 2048,
  BUTTONS_MONITOR_FAULT = 4096,
  BSPD_PREFAULT = 8192,
  LV_MONITOR_FAULT = 16384,
  BATTERY_THERMISTOR = 32768,
  RTDS_FAULT = 65536
}

export class MPUFault implements Fault<MPUFaultType> {
  name: MPU_FAULTS_VALUES;
  timeTriggered: number;
  format(): { type: String; name: String; timeTriggered: number } {
    throw new Error('Method not implemented.');
  }
  /**
   * Constructs a new MPU fault base on a valid faultValue
   * @param faultValue
   * @param timeTriggered
   */
  constructor(faultValue: MPU_FAULTS_VALUES, timeTriggered: number) {
    this.name = faultValue;
    this.timeTriggered = timeTriggered;
  }
  getRelevantNodes(timeFrame: number): Node[] {
    throw new Error('Method not implemented.');
  }
}
