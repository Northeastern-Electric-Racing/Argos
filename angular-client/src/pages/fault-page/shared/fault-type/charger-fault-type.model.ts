import { Fault } from '../indiv-fault/fault.model';
import { FaultType, FaultTypeModel } from './fault-type.model';

export class ChargerFaultType implements FaultTypeModel {
  subscribeToFaults(): Fault<ChargerFaultType> {
    // TODO
    throw new Error('Method not implemented.');
  }
  name = FaultType.Charger;
  recordedFaults: Fault<ChargerFaultType>[] = [];
}
