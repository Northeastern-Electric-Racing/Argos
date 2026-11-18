import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LoopStatus } from '../../shutdown-loop.utils';

/** Verdict banner: where the loop is broken, the BMS TS chip, and any sensor mismatch. */
@Component({
  selector: 'loop-banner',
  templateUrl: './loop-banner.component.html',
  styleUrls: ['../../shutdown-states.css', './loop-banner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoopBannerComponent {
  status = input.required<LoopStatus>();
  tsOn = input<boolean | undefined>(undefined);

  readonly headline = computed(() => {
    const s = this.status();
    switch (s.verdict) {
      case 'open': {
        const labels = s.suspects.map((n) => n.label);
        return labels.length === 1 ? `LOOP OPEN — cause: ${labels[0]}` : `LOOP OPEN — cause is one of: ${labels.join(', ')}`;
      }
      case 'closed':
        return 'LOOP CLOSED · AIRs on';
      case 'unknown':
        return `UNKNOWN — no data from ${s.silentBoards.join(' and ')}`;
    }
  });

  readonly stateClass = computed(() => {
    switch (this.status().verdict) {
      case 'open':
        return 'state-suspect';
      case 'closed':
        return 'state-closed';
      case 'unknown':
        return 'state-no-data';
    }
  });

  readonly mismatchText = computed(() => {
    const s = this.status();
    if (!s.mismatch) return undefined;
    const labels = s.nodes.filter((n) => n.mismatch).map((n) => n.node.label);
    return `Sensor mismatch: ${labels.join(', ')} read closed after the break`;
  });

  readonly tsText = computed(() => {
    const on = this.tsOn();
    return on === undefined ? 'BMS: TS —' : on ? 'BMS: TS ON' : 'BMS: TS OFF';
  });
}
