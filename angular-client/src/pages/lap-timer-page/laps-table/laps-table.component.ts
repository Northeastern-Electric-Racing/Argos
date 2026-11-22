import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import LapTimerService from 'src/services/lap-timer.service';
import { cellClass, lightHeaderCellClass } from 'src/ui/recipes/table';
import { cx, tw } from 'src/ui/recipes/tw';
import { formatDeltaMs, formatMs, Lap } from 'src/utils/lap-timer.types';
import { lapTimerClasses } from '../lap-timer.classes';

/** Every column is numeric and right-aligned; times use tabular figures so they line up. */
const plain = cx(cellClass(), tw('text-right'));
const mono = cx(plain, tw('tabular-nums'));
/** The best and worst laps carry a 3px green or red edge on their first cell. */
const edges = {
  best: tw('border-l-3 border-l-battery-high'),
  worst: tw('border-l-3 border-l-battery-low')
} as const;

@Component({
  selector: 'laps-table',
  templateUrl: './laps-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-full' },
  imports: [DatePipe, DecimalPipe, UiIconComponent, InfoBackgroundComponent, TypographyComponent]
})
export default class LapsTableComponent {
  readonly timer = inject(LapTimerService);

  readonly lapsNewestFirst: Signal<Lap[]> = computed(() => this.timer.laps().slice().reverse());

  protected readonly cls = lapTimerClasses;
  protected readonly rowClass = tw('hover:bg-fg/4');
  protected readonly headers = {
    num: cx(lightHeaderCellClass({ align: 'right' }), tw('w-14')),
    dur: cx(lightHeaderCellClass({ align: 'right' }), tw('w-25')),
    delta: cx(lightHeaderCellClass({ align: 'right' }), tw('w-27.5')),
    time: cx(lightHeaderCellClass({ align: 'right' }), tw('w-32.5')),
    run: cx(lightHeaderCellClass({ align: 'right' }), tw('w-16')),
    stat: cx(lightHeaderCellClass({ align: 'right' }), tw('w-25'))
  };
  /** A slower lap's delta to the best is positive: red text (accent-fg, AA on the card). */
  protected readonly cells = { plain, mono, slower: cx(mono, tw('text-accent-fg')) };

  numCellClass(lap: Lap): string {
    return cx(plain, this.isBestLap(lap) && edges.best, this.isWorstLap(lap) && edges.worst);
  }

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
