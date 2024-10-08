import { Fault } from '../indiv-fault/fault.model';
import { FaultType, FaultTypeModel } from './fault-type.model';

export class MPUFaultType implements FaultTypeModel {
  subscribeToFaults(): Fault<MPUFaultType> {
    // TODO
    throw new Error('Method not implemented.');
  }
  name = FaultType.MPU;
  recordedFaults: Fault<MPUFaultType>[] = [];
}
