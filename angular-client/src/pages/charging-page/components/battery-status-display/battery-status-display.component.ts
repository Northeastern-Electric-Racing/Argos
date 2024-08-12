import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'battery-status-display',
  templateUrl: './battery-status-display.component.html',
  styleUrls: ['./battery-status-display.component.css']
})
export default class BatteryStatusDisplay {
  isBalancing: boolean = false;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.STATUS_BALANCING).subscribe((value) => {
      this.isBalancing = floatPipe(value.values[0]) === 1;
    });
  }

  getBatteryStatus(connected: boolean) {
    return connected ? 'BALANCING' : 'NOT BALANCING';
  }

  getStatusColor(isBalancing: boolean) {
    return isBalancing ? 'green' : 'red';
  }
}
