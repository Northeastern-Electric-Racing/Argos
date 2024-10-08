import { Fault } from '../indiv-fault/fault.model';
import { FaultType, FaultTypeModel } from './fault-type.model';

export class DTIFaultType implements FaultTypeModel {
  subscribeToFaults(): Fault<DTIFaultType> {
    // TODO
    throw new Error('Method not implemented.');
  }
  name = FaultType.DTI;
  recordedFaults: Fault<DTIFaultType>[] = [];
}
