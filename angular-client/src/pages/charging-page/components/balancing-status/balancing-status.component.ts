import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'balancing-status',
  templateUrl: './balancing-status.component.html',
  styleUrls: ['./balancing-status.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class BalancingStatusComponent implements OnInit, OnDestroy {
  @Input() displayLight: boolean = true;
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  isBalancing: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('balancing-total-seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  ngOnInit() {
    this.subscriptions.push(
      this.storage.getTimerData(topics.statusBalancing()).subscribe((value) => {
        const statusBalancingValue = value.last_value;
        if (this.isBalancing) {
          if (!(statusBalancingValue === 1)) {
            this.isBalancing = false;
            this.currentSeconds = 0;
          }
        } else if (statusBalancingValue === 1) {
          this.isBalancing = true;
        }

        if (statusBalancingValue === 1) {
          this.currentSeconds = (Date.now() - value.last_change) / 1000;
        }
        this.totalSeconds = Math.round(
          value.total_time_per_value_map[1].reduce((acc, currVal) => acc + (currVal.end_time - currVal.start_time), 0) /
            1000 +
            this.currentSeconds
        );
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getBatteryStatus(connected: boolean) {
    return connected ? 'BALANCING' : 'NOT BALANCING';
  }

  getStatusColor(isBalancing: boolean) {
    return isBalancing ? 'blue' : Theme.infoBackground;
  }
}
