import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'charging-state',
  templateUrl: './charging-state.component.html',
  styleUrls: ['./charging-state.component.css']
})
export default class ChargingStateComponent {
  isCharging: boolean = false;
  timer: number = 0;
  timerInterval: any;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.CHARGING).subscribe((value) => {
      this.isCharging = floatPipe(value.values[0]) === 1;
    });
  }

  getChargingState(connected: boolean) {
    return connected ? 'PAUSED' : 'NOT PAUSED';
  }

  getStateColor(isCharging: boolean) {
    return isCharging ? 'yellow' : Theme.infoBackground;
  }
}
