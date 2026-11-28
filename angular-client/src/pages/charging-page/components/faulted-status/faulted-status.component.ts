import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { statusLightClasses } from '../../charging.classes';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'faulted-status',
  templateUrl: './faulted-status.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class FaultedStatusComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  displayLight = input<boolean>(true);
  private storage = inject(Storage);
  readonly graphTopics = [topics.bmsMode()];
  isFaulted = signal(false);
  protected lightClass = computed(() => (this.isFaulted() ? statusLightClasses.faulted : statusLightClasses.off));
  currentSeconds = signal(0);
  totalSeconds = signal(Number(sessionStorage.getItem('faulted-total-seconds')) || 0);

  ngOnInit() {
    this.storage
      .getTimerData(topics.bmsMode())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const statusStateValue = value.last_value;
        if (this.isFaulted()) {
          if (!(statusStateValue === 3)) {
            this.isFaulted.set(false);
            this.currentSeconds.set(0);
          }
        } else if (statusStateValue === 3) {
          this.isFaulted.set(true);
        }

        if (statusStateValue === 3) {
          this.currentSeconds.set((Date.now() - value.last_change) / 1000);
        }

        this.totalSeconds.set(
          Math.round(
            (value.total_time_per_value_map[3] ?? []).reduce(
              (acc, currVal) => acc + (currVal.end_time - currVal.start_time),
              0
            ) /
              1000 +
              this.currentSeconds()
          )
        );
      });
  }
}
