import { Fault } from '../indiv-fault/fault.model';
import { FaultType, FaultTypeModel } from './fault-type.model';

export class BMSFaultType implements FaultTypeModel {
  subscribeToFaults(): Fault<FaultTypeModel> {
    // TODO
    throw new Error('Method not implemented.');
  }
  name = FaultType.BMS;
  recordedFaults: Fault<FaultTypeModel>[] = [];
}
