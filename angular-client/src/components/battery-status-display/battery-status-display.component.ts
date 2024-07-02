import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'battery-status-display',
  templateUrl: './battery-status-display.component.html',
  styleUrls: ['./battery-status-display.component.css']
})
export default class BatteryStatusDisplay {
  chargeString!: string;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.STATUS).subscribe((value) => {
      [this.chargeString] = value.values || ['NOT CONNECTED'];
    });
  }

  getBatteryStatus(connected: boolean) {
    return connected ? 'Connected' : 'Disconnected';
  }

  getStatusColor(chargeString: string) {
    return chargeString === 'BALANCING' ? 'green' : 'red';
  }
}
