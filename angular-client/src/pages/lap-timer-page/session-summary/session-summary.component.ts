import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { cx, tw } from 'src/ui/recipes/tw';
import { formatMs } from 'src/utils/lap-timer.types';
import { lapTimerClasses } from '../lap-timer.classes';

const statValue = tw('font-sans text-base font-medium text-fg tabular-nums');

@Component({
  selector: 'session-summary',
  templateUrl: './session-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-full' },
  imports: [DecimalPipe, InfoBackgroundComponent]
})
export default class SessionSummaryComponent {
  readonly timer = inject(LapTimerService);

  protected readonly cls = lapTimerClasses;
  protected readonly lapsClass = lapTimerClasses.lapCount;
  protected readonly dividerClass = cx(lapTimerClasses.divider, tw('my-2'));
  protected readonly statRow = tw('flex items-baseline justify-between');
  /** Best, Avg, Energy, Run: fg-muted, AA on the card. */
  protected readonly statLabel = tw('text-sm text-fg-muted');
  protected readonly statValue = statValue;
  protected readonly bestValue = tw('font-sans text-base font-medium text-battery-high tabular-nums');

  formatLapMs(ms: number): string {
    return formatMs(ms);
  }
}
