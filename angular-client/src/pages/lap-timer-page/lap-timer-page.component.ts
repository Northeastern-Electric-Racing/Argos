import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
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
  providers: [ConfirmationService, MessageService],
  imports: [
    MatGridList,
    MatGridTile,
    ConfirmDialog,
    Toast,
    HalfGaugeComponent,
    InfoBackgroundComponent,
    GaugeStatComponent,
    SessionsPanelComponent,
    TimerHeroComponent,
    SessionSummaryComponent,
    LapsTableComponent
  ]
})
export default class LapTimerPageComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);

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

  private subs: Subscription[] = [];

  ngOnInit(): void {
    const styles = getComputedStyle(document.documentElement);
    const high = styles.getPropertyValue('--color-battery-high').trim();
    if (high) this.speedGaugeColor.set(high);

    this.subs.push(
      this.storage.get(topics.speed()).subscribe((v) => this.liveSpeed.set(parseFloat(v.values[0]) || 0)),
      this.storage.get(topics.motorTemp()).subscribe((v) => this.liveMotorTemp.set(parseFloat(v.values[0]) || 0)),
      this.storage.get(topics.stateOfCharge()).subscribe((v) => this.liveSoc.set(parseFloat(v.values[0]) || 0))
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
