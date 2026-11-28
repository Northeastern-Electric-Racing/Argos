import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { statusLightClasses } from '../../charging.classes';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'charging-status',
  templateUrl: './charging-status.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class ChargingStatusComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  displayLight = input<boolean>(true);
  private storage = inject(Storage);
  readonly graphTopics = [topics.charging()];
  isCharging = signal(false);
  protected lightClass = computed(() => (this.isCharging() ? statusLightClasses.charging : statusLightClasses.off));
  currentSeconds = signal(0);
  totalSeconds = signal(Number(sessionStorage.getItem('charging-total-seconds')) || 0);

  ngOnInit() {
    this.storage
      .getTimerData(topics.charging())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const chargingControlValue = value.last_value;
        if (this.isCharging()) {
          if (chargingControlValue === 1) {
            this.isCharging.set(false);
            this.currentSeconds.set(0);
          }
        } else if (chargingControlValue === 0) {
          this.isCharging.set(true);
        }

        if (chargingControlValue === 0) {
          this.currentSeconds.set((Date.now() - value.last_change) / 1000);
        }
        this.totalSeconds.set(
          Math.round(
            (value.total_time_per_value_map[0] ?? []).reduce(
              (acc, currVal) => acc + (currVal.end_time - currVal.start_time),
              0
            ) /
              1000 +
              this.currentSeconds()
          )
        );
      });
  }

  getChargingState(connected: boolean) {
    return connected ? 'PAUSED' : 'NOT PAUSED';
  }
}
