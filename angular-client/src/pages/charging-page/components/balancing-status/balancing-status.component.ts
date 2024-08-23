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
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('balancing total seconds')) || 0;
  intervalId!: NodeJS.Timeout;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.STATUS_BALANCING).subscribe((value) => {
      if (this.isBalancing) {
        if (!(floatPipe(value.values[0]) === 1)) {
          this.isBalancing = false;
          this.stopTimer();
          this.resetCurrentSecs();
        }
      } else if (floatPipe(value.values[0]) === 1) {
        this.isBalancing = true;
        this.startTimer();
      }
    });
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.currentSeconds++;
      this.totalSeconds++;
      sessionStorage.setItem('balancing total seconds', this.totalSeconds.toString());
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.intervalId);
  }

  resetCurrentSecs() {
    this.currentSeconds = 0;
  }

  getBatteryStatus(connected: boolean) {
    return connected ? 'BALANCING' : 'NOT BALANCING';
  }

  getStatusColor(isBalancing: boolean) {
    return isBalancing ? 'blue' : Theme.infoBackground;
  }
}
