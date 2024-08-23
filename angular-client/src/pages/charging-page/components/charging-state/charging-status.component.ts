import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'charging-status',
  templateUrl: './charging-status.component.html',
  styleUrls: ['./charging-status.component.css']
})
export default class ChargingStatusComponent {
  isCharging: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('charging total seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.CHARGING).subscribe((value) => {
      if (this.isCharging) {
        if (!(floatPipe(value.values[0]) === 1)) {
          this.isCharging = false;
          this.stopTimer();
          this.resetCurrentSecs();
        }
      } else if (floatPipe(value.values[0]) === 1) {
        this.isCharging = true;
        this.startTimer();
      }
    });
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.currentSeconds++;
      this.totalSeconds++;
      sessionStorage.setItem('charging total seconds', this.totalSeconds.toString());
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.intervalId);
  }

  resetCurrentSecs() {
    this.currentSeconds = 0;
  }

  getChargingState(connected: boolean) {
    return connected ? 'PAUSED' : 'NOT PAUSED';
  }

  getStateColor(isCharging: boolean) {
    return isCharging ? 'yellow' : Theme.infoBackground;
  }
}
