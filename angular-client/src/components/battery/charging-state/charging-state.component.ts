import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
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
    this.startTimer();
    this.storage.get(IdentifierDataType.CHARGING).subscribe((value) => {
      const newChargingState = floatPipe(value.values[0]) === 1;

      if (this.isCharging !== newChargingState) {
        this.resetTimer();
        if (newChargingState) {
          this.startTimer();
        }
      }

      this.isCharging = newChargingState;
    });
  }

  getChargingState(connected: boolean) {
    return connected ? 'PAUSED' : 'NOT PAUSED';
  }

  getStateColor(isCharging: boolean) {
    return isCharging ? 'green' : 'red';
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timer++;
    }, 1000);
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timer = 0;
  }

  getTimerInfo() {
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
