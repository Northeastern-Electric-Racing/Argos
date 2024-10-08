import { Node } from 'src/utils/types.utils';
import { FaultTypeModel } from '../fault-type/fault-type.model';
import { BMS_FAULTS_VALUES } from './bms-fault.model';
import { CHARGER_FAULT_VALUES } from './charger-fault.model';
import { DTI_FAULTS_VALUES } from './dti-fault.model';
import { MPU_FAULTS_VALUES } from './mpu-fault.model';

export interface Fault<T extends FaultTypeModel> {
  name: AllFaultEnums;
  timeTriggered: number;
  format(): { type: String; name: String; timeTriggered: number };
  getRelevantNodes(timeFrame: number): Node[];
}

export type AllFaultEnums = BMS_FAULTS_VALUES | CHARGER_FAULT_VALUES | DTI_FAULTS_VALUES | MPU_FAULTS_VALUES;
