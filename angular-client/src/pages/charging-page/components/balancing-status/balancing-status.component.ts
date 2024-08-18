import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'balancing-status',
  templateUrl: './balancing-status.component.html',
  styleUrls: ['./balancing-status.component.css']
})
export default class BalancingStatus {
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
    return isBalancing ? 'blue' : Theme.infoBackground;
  }
}
