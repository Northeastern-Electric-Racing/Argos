import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'faulted-status',
  templateUrl: './faulted-status.component.html',
  styleUrls: ['./faulted-status.component.css']
})
export default class FaultedStatus {
  isFaulted: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(localStorage.getItem('faulted total seconds')) || 0;
  intervalId!: NodeJS.Timeout;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.BMS_MODE).subscribe((value) => {
      if (this.isFaulted) {
        if (!(floatPipe(value.values[0]) === 3)) {
          this.isFaulted = false;
          this.stopTimer();
          this.resetCurrentSecs();
        }
      } else if (floatPipe(value.values[0]) === 3) {
        this.isFaulted = true;
        this.startTimer();
      }
    });
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.currentSeconds++;
      this.totalSeconds++;
      localStorage.setItem('faulted total seconds', this.totalSeconds.toString());
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.intervalId);
  }

  resetCurrentSecs() {
    this.currentSeconds = 0;
  }

  getStatusColor(isFaulted: boolean) {
    return isFaulted ? 'red' : Theme.infoBackground;
  }
}
