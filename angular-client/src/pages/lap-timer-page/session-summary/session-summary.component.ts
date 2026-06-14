import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatMs } from 'src/utils/lap-timer.types';

@Component({
  selector: 'session-summary',
  templateUrl: './session-summary.component.html',
  styleUrl: './session-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, InfoBackgroundComponent]
})
export default class SessionSummaryComponent {
  readonly timer = inject(LapTimerService);

  formatLapMs(ms: number): string {
    return formatMs(ms);
  }
}
