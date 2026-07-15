import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TableModule } from 'primeng/table';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatDeltaMs, formatMs, Lap } from 'src/utils/lap-timer.types';

@Component({
  selector: 'laps-table',
  templateUrl: './laps-table.component.html',
  styleUrl: './laps-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, MatIcon, TableModule, InfoBackgroundComponent, TypographyComponent]
})
export default class LapsTableComponent {
  readonly timer = inject(LapTimerService);

  readonly lapsNewestFirst: Signal<Lap[]> = computed(() => this.timer.laps().slice().reverse());

  formatLapMs(ms: number): string {
    return formatMs(ms);
  }

  formatLapDelta(lap: Lap): string {
    return formatDeltaMs(this.timer.deltaFromBest(lap.durationMs));
  }

  isBestLap(lap: Lap): boolean {
    return this.timer.bestLap()?.number === lap.number;
  }

  isWorstLap(lap: Lap): boolean {
    if (this.timer.laps().length < 3) return false;
    return this.timer.worstLap()?.number === lap.number;
  }
}
