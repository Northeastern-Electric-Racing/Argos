import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'balancing-status',
  templateUrl: './balancing-status.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class BalancingStatusComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  displayLight = input<boolean>(true);
  private storage = inject(Storage);
  isBalancing = signal(false);
  currentSeconds = signal(0);
  totalSeconds = signal(Number(sessionStorage.getItem('balancing-total-seconds')) || 0);

  ngOnInit() {
    this.storage
      .getTimerData(topics.statusBalancing())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const statusBalancingValue = value.last_value;
        if (this.isBalancing()) {
          if (!(statusBalancingValue === 1)) {
            this.isBalancing.set(false);
            this.currentSeconds.set(0);
          }
        } else if (statusBalancingValue === 1) {
          this.isBalancing.set(true);
        }

        if (statusBalancingValue === 1) {
          this.currentSeconds.set((Date.now() - value.last_change) / 1000);
        }
        this.totalSeconds.set(
          Math.round(
            (value.total_time_per_value_map[1] ?? []).reduce(
              (acc, currVal) => acc + (currVal.end_time - currVal.start_time),
              0
            ) /
              1000 +
              this.currentSeconds()
          )
        );
      });
  }

  getBatteryStatus(connected: boolean) {
    return connected ? 'BALANCING' : 'NOT BALANCING';
  }
}
