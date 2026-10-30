import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import HalfGaugeComponent from 'src/components/half-gauge/half-gauge.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import { GaugeStatComponent } from 'src/components/gauge-stat/gauge-stat.component';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import SessionsPanelComponent from './sessions-panel/sessions-panel.component';
import TimerHeroComponent from './timer-hero/timer-hero.component';
import SessionSummaryComponent from './session-summary/session-summary.component';
import LapsTableComponent from './laps-table/laps-table.component';

@Component({
  selector: 'lap-timer-page',
  templateUrl: './lap-timer-page.component.html',
  styleUrl: './lap-timer-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatGridList,
    MatGridTile,
    HalfGaugeComponent,
    InfoBackgroundComponent,
    GaugeStatComponent,
    SessionsPanelComponent,
    TimerHeroComponent,
    SessionSummaryComponent,
    LapsTableComponent
  ]
})
export default class LapTimerPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);

  /** Phones get a two-column grid (the CDK breakpoint observer drives mat-grid-list's layout). */
  private readonly compact = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 768px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  /** Column count and each tile's [colspan, rowspan], keyed by tile. */
  readonly layout = computed(() =>
    this.compact()
      ? {
          cols: 2,
          sessions: [2, 8],
          timer: [2, 9],
          summary: [2, 8],
          speed: [2, 6],
          battery: [1, 4],
          motor: [1, 4],
          laps: [2, 22]
        }
      : {
          cols: 6,
          sessions: [6, 8],
          timer: [3, 9],
          summary: [1, 9],
          speed: [2, 5],
          battery: [1, 4],
          motor: [1, 4],
          laps: [6, 22]
        }
  );

  readonly liveSpeed = signal(0);
  readonly liveMotorTemp = signal(0);
  readonly liveSoc = signal(0);

  readonly speedGaugeColor = signal('#1ae824');

  readonly socColor = computed(() => {
    const soc = this.liveSoc();
    if (soc >= 60) return 'var(--color-battery-high)';
    if (soc >= 30) return 'var(--color-battery-med)';
    return 'var(--color-battery-low)';
  });

  readonly motorTempColor = computed(() => {
    const t = this.liveMotorTemp();
    if (t < 60) return 'var(--color-text-primary)';
    if (t < 80) return 'var(--color-battery-med)';
    return 'var(--color-battery-low)';
  });

  ngOnInit(): void {
    const styles = getComputedStyle(document.documentElement);
    const high = styles.getPropertyValue('--color-battery-high').trim();
    if (high) this.speedGaugeColor.set(high);

    this.storage
      .get(topics.speed())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.liveSpeed.set(parseFloat(v.values[0]) || 0));
    this.storage
      .get(topics.motorTemp())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.liveMotorTemp.set(parseFloat(v.values[0]) || 0));
    this.storage
      .get(topics.stateOfCharge())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.liveSoc.set(parseFloat(v.values[0]) || 0));
  }
}
