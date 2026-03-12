import { Component, OnInit, inject, input } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { DataTypeEnum } from 'src/data-type.enum';
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
  displayLight = input<boolean>(true);
  private storage = inject(Storage);
  isFaulted: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('faulted-total-seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  ngOnInit() {
    this.storage.getTimerData(DataTypeEnum.BMS_MODE).subscribe((value) => {
      const statusStateValue = value.last_value;
      if (this.isFaulted) {
        if (!(statusStateValue === 3)) {
          this.isFaulted = false;
          this.currentSeconds = 0;
        }
      } else if (statusStateValue === 3) {
        this.isFaulted = true;
      }

      if (statusStateValue === 3) {
        this.currentSeconds = (Date.now() - value.last_change) / 1000;
      }

      this.totalSeconds = Math.round(
        value.total_time_per_value_map[3].reduce((acc, currVal) => acc + (currVal.end_time - currVal.start_time), 0) / 1000 +
          this.currentSeconds
      );
    });
  }

  getStatusColor(isFaulted: boolean) {
    return isFaulted ? 'red' : Theme.infoBackground;
  }
}
