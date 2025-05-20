import { Pipe, PipeTransform } from '@angular/core';
import { Chip } from '../bms.utils';
import { FaultData } from '../types.utils';
@Pipe({
    name: 'chipFault',
    standalone: true
})
export class ChipFaultPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(data: any, chip: Chip, segment: number, faultName: string): FaultData | null {
    // If the first value is zero, return null (i.e. no fault)
    if (!data || parseInt(data.values[0], 10) === 0) {
      return null;
    }

    // Create the fault object
    const fault: FaultData = {
      node: 'BMS',
      name: 'PerCell/' + (chip === Chip.Alpha ? 'Alpha' : 'Beta') + '/' + segment + '/' + faultName,
      occurredAt: new Date(parseInt(data.time, 10)),
      lastSeen: new Date(parseInt(data.time, 10)),
      expired: false
    };

    return fault;
  }
}
