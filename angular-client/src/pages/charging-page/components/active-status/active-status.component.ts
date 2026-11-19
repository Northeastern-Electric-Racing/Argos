import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { statusLightClasses } from '../../charging.classes';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'active-status',
  templateUrl: './active-status.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class ActiveStatusComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  displayLight = input<boolean>(true);
  private storage = inject(Storage);
  isActive = signal(false);
  protected lightClass = computed(() => (this.isActive() ? statusLightClasses.active : statusLightClasses.off));
  currentSeconds = signal(0);
  totalSeconds = signal(Number(sessionStorage.getItem('active-total-seconds')) || 0);

  ngOnInit() {
    this.storage
      .getTimerData(topics.bmsMode())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const statusStateValue = value.last_value;
        if (this.isActive()) {
          if (!(statusStateValue === 2)) {
            this.isActive.set(false);
            this.currentSeconds.set(0);
          }
        } else if (statusStateValue === 2) {
          this.isActive.set(true);
        }
        if (statusStateValue === 2) {
          this.currentSeconds.set((Date.now() - value.last_change) / 1000);
        }
        this.totalSeconds.set(
          Math.round(
            (value.total_time_per_value_map[2] ?? []).reduce(
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
