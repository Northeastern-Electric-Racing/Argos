import { Component, Input, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'active-status',
  templateUrl: './active-status.component.html',
  styleUrls: ['./active-status.component.css']
})
export default class ActiveStatusComponent implements OnInit {
  @Input() displayLight: boolean = true;
  private storage = inject(Storage);
  isActive: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('active-total-seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  ngOnInit() {
    this.storage.get(DataTypeEnum.BMS_MODE).subscribe((value) => {
      const statusStateValue = floatPipe(value.values[0]);
      if (this.isActive) {
        if (!(statusStateValue === 2)) {
          this.isActive = false;
          this.stopTimer();
          this.resetCurrentSecs();
        }
      } else if (statusStateValue === 2) {
        this.isActive = true;
        this.startTimer();
      }
    });
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.currentSeconds++;
      this.totalSeconds++;
      sessionStorage.setItem('active-total-seconds', this.totalSeconds.toString());
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.intervalId);
  }

  resetCurrentSecs() {
    this.currentSeconds = 0;
  }
  getStatusColor(isActive: boolean) {
    return isActive ? 'green' : Theme.infoBackground;
  }
}
