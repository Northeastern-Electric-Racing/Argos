import { Fault } from '../indiv-fault/fault.model';
/**
 * Represents a type of fault (e.g. BMS, TPU, Charger),
 * with a name (which would mach the previous examples)
 * and a list of recorded faults so far.
 *
 * It also gives the ability to subscribe to it's list of recored faults
 * which will allow for the subscriber to be updated everytime a new fault is recieved.
 */
export interface FaultTypeModel {
  name: FaultType;
  recordedFaults: Array<Fault<FaultTypeModel>>;
  subscribeToFaults(): Fault<FaultTypeModel>;
}

export enum FaultType {
  BMS = 'BMS',
  Charger = 'Charger'
}
