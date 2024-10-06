import { BMSFaultType } from '../fault-type/bms-fault-type.model';
import { Fault } from './fault.model';

export class BMSFault implements Fault<BMSFaultType> {
  name: String;
  timeTriggered: number;
  format(): { type: String; name: String; timeTriggered: number } {
    throw new Error('Method not implemented.');
  }
  constructor() {
    this.name = 'hello';
    this.timeTriggered = 101011;
  }
}
