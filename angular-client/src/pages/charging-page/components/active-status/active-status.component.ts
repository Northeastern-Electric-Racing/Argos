import { Component, Input, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'active-status',
  templateUrl: './active-status.component.html',
  styleUrls: ['./active-status.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class ActiveStatusComponent implements OnInit {
  @Input() displayLight: boolean = true;
  private storage = inject(Storage);
  isActive: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('active-total-seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  ngOnInit() {
    this.storage.getTimerData(topics.bmsMode()).subscribe((value) => {
      const statusStateValue = value.last_value;
      if (this.isActive) {
        if (!(statusStateValue === 2)) {
          this.isActive = false;
          this.currentSeconds = 0;
        }
      } else if (statusStateValue === 2) {
        this.isActive = true;
      }
      if (statusStateValue === 2) {
        this.currentSeconds = (Date.now() - value.last_change) / 1000;
      }
      this.totalSeconds = Math.round(
        value.total_time_per_value_map[2].reduce((acc, currVal) => acc + (currVal.end_time - currVal.start_time), 0) / 1000 +
          this.currentSeconds
      );
    });
  }

  getStatusColor(isActive: boolean) {
    return isActive ? 'green' : Theme.infoBackground;
  }
}
