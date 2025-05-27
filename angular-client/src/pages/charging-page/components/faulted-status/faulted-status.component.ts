import { Component, Input, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'faulted-status',
  templateUrl: './faulted-status.component.html',
  styleUrls: ['./faulted-status.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class FaultedStatusComponent implements OnInit {
  @Input() displayLight: boolean = true;
  private storage = inject(Storage);
  isFaulted: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('faulted-total-seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  ngOnInit() {
    this.storage.get(DataTypeEnum.BMS_MODE).subscribe((value) => {
      const statusStateValue = floatPipe(value.values[0]);
      if (this.isFaulted) {
        if (!(statusStateValue === 3)) {
          this.isFaulted = false;
          this.stopTimer();
          this.resetCurrentSecs();
        }
      } else if (statusStateValue === 3) {
        this.isFaulted = true;
        this.startTimer();
      }
    });
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.currentSeconds++;
      this.totalSeconds++;
      sessionStorage.setItem('faulted-total-seconds', this.totalSeconds.toString());
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
