import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from 'src/ui/recipes/tw';
import { STALE_AFTER_MS, LoopStatus, Verdict } from '../../shutdown-loop.utils';

/**
 * Per verdict: the box, the title colour and icon. Only an open loop is filled (the fault orange under white text,
 * 5.06:1), so the abnormal state shouts; closed and unknown sit on a surface with a coloured edge.
 */
const VERDICT: Record<Verdict, { box: string; title: string; icon: string; label: string }> = {
  open: {
    box: tw('border-solid border-fault bg-fault text-on-fault'),
    title: tw('text-on-fault'),
    icon: 'link_off',
    label: 'LOOP OPEN'
  },
  closed: {
    box: tw('border-solid border-success bg-surface-1 text-fg'),
    title: tw('text-success'),
    icon: 'link',
    label: 'LOOP CLOSED · AIRs on'
  },
  unknown: {
    box: tw('border-solid border-fg-muted bg-surface-1 text-fg'),
    title: tw('text-fg'),
    icon: 'help_outline',
    label: 'UNKNOWN'
  }
};

const boxBase = tw('flex items-start gap-4 rounded-md border-l-8 p-4 max-md:gap-3 max-md:p-3');
/** A suspect's name as a button on the orange fill: a dark chip, so it reads at any size. */
const chipBase = tw(
  'inline-flex min-h-8 cursor-pointer items-center rounded-full border-2 bg-page px-3 text-base font-bold hover:bg-surface-2 focus-visible:focus-ring'
);
const chipSuspect = tw('border-solid border-page text-fg');
const chipNoData = tw('border-dashed border-fg-muted text-fg-muted');

/**
 * The verdict: whether the loop is open, closed or unknown, naming the suspect(s) as buttons that select them, plus
 * the sensor-mismatch and silent-board warnings. A polite live region announces the verdict in one sentence when
 * it changes (not on every clock tick: its text only changes with the verdict).
 */
@Component({
  selector: 'loop-banner',
  templateUrl: './loop-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  imports: [UiIconComponent]
})
export class LoopBannerComponent {
  status = input.required<LoopStatus>();
  nodeSelect = output<string | null>();

  protected readonly chipSuspect = cx(chipBase, chipSuspect);
  protected readonly chipNoData = cx(chipBase, chipNoData);
  protected readonly verdict = computed(() => VERDICT[this.status().verdict]);
  protected readonly boxClass = computed(() => cx(boxBase, this.verdict().box));

  /** The verdict as one sentence, for the live region. */
  readonly headline = computed(() => {
    const s = this.status();
    switch (s.verdict) {
      case 'open': {
        const labels = s.suspects.map((n) => n.label);
        const noData = s.noDataInStretch.map((n) => `${n.label} (no data)`);
        if (labels.length === 1 && noData.length === 0) return `LOOP OPEN — cause: ${labels[0]}`;
        const tail = noData.length ? `, or ${noData.join(', ')}` : '';
        return `LOOP OPEN — cause is one of: ${labels.join(', ')}${tail}`;
      }
      case 'closed':
        return 'LOOP CLOSED · AIRs on';
      case 'unknown':
        return `UNKNOWN — no data from ${this.boards()}`;
    }
  });

  protected readonly single = computed(() => {
    const s = this.status();
    return s.suspects.length === 1 && s.noDataInStretch.length === 0;
  });

  protected readonly boards = computed(() => this.status().silentBoards.join(' and '));

  readonly mismatchText = computed(() => {
    const s = this.status();
    if (!s.mismatch) return undefined;
    const labels = s.nodes.filter((n) => n.mismatch).map((n) => n.node.label);
    return `Sensor mismatch: ${labels.join(', ')} read closed after the break`;
  });

  /** Under an UNKNOWN verdict the title already names the silent boards. */
  protected readonly silentText = computed(() => {
    const s = this.status();
    if (s.verdict === 'unknown' || !s.silentBoards.length) return undefined;
    return `No data from ${this.boards()} for over ${STALE_AFTER_MS / 1000} s: its readings are skipped, which can widen the suspect stretch.`;
  });

  protected readonly announcement = computed(() => {
    const mismatch = this.mismatchText();
    return mismatch ? `${this.headline()}. ${mismatch}.` : this.headline();
  });
}
