import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from 'src/ui/recipes/tw';
import { boardFreshness, formatAge } from '../../shutdown-loop.display';
import { NodeStatus } from '../../shutdown-loop.utils';

const chipBase = tw(
  'inline-flex min-h-8 items-center gap-1.5 rounded-full border-2 bg-surface-1 px-3 text-sm whitespace-nowrap max-md:min-h-7 max-md:gap-1 max-md:px-2 max-md:text-xs'
);
/** TS ON means the tractive system is live: warn yellow, so it is never missed. */
const TS = {
  on: { chip: tw('border-solid border-warn font-bold text-warn'), icon: 'bolt', text: 'TS ON', known: true },
  off: { chip: tw('border-solid border-control-border text-fg'), icon: 'power_off', text: 'TS OFF', known: true },
  unknown: {
    chip: tw('border-dashed border-control-border text-fg-muted'),
    icon: 'help_outline',
    text: 'TS unknown',
    known: false
  }
};
/** Who decided the loop node states (LoopStatus.source; undefined means this client). */
const SOURCE = {
  server: { icon: 'dns', text: 'scylla', title: 'Loop node states decided by scylla-server, which sees every message' },
  local: {
    icon: 'computer',
    text: 'this client',
    title: 'Loop node states worked out in this browser from its own readings'
  }
};
const fresh = tw('border-solid border-border text-fg-label');
const stale = tw('border-dashed border-warn text-warn');
const partlyStale = tw('border-solid border-warn text-fg-label');

/**
 * Header chips: the BMS's TS ON/OFF state, how fresh each board's readings are (stale only when logic calls every
 * measured loop node of the board no-data; "· N stale" when some are), and who decided the states.
 */
@Component({
  selector: 'loop-meta',
  templateUrl: './loop-meta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-2 max-md:gap-1.5' },
  imports: [UiIconComponent]
})
export class LoopMetaComponent {
  nodes = input.required<NodeStatus[]>();
  /** From BMS/Shutdown/State; undefined while the BMS is silent. */
  tsOn = input<boolean | undefined>(undefined);
  /** LoopStatus.source: undefined is treated as 'local'. */
  source = input<'local' | 'server' | undefined>(undefined);

  protected readonly sourceChip = cx(chipBase, fresh);
  protected readonly sourceInfo = computed(() => SOURCE[this.source() ?? 'local']);

  protected readonly ts = computed(() => {
    const on = this.tsOn();
    const t = on === undefined ? TS.unknown : on ? TS.on : TS.off;
    return { ...t, chip: cx(chipBase, t.chip) };
  });

  protected readonly boards = computed(() =>
    boardFreshness(this.nodes()).map((f) => ({
      ...f,
      chip: cx(chipBase, f.stale ? stale : f.staleCount ? partlyStale : fresh),
      text: `${f.ageMs === undefined ? 'never' : formatAge(f.ageMs)}${f.stale ? ' · stale' : f.staleCount ? ` · ${f.staleCount} stale` : ''}`
    }))
  );
}
