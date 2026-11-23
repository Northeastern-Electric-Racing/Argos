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
  on: { chip: tw('border-solid border-warn font-bold text-warn'), icon: 'bolt', text: 'TS ON' },
  off: { chip: tw('border-solid border-control-border text-fg'), icon: 'power_off', text: 'TS OFF' },
  unknown: { chip: tw('border-dashed border-control-border text-fg-muted'), icon: 'help_outline', text: 'TS —' }
};
const fresh = tw('border-solid border-border text-fg-label');
const stale = tw('border-dashed border-warn text-warn');

/** Header chips: the BMS's TS ON/OFF state and how fresh each board's readings are. */
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

  protected readonly ts = computed(() => {
    const on = this.tsOn();
    const t = on === undefined ? TS.unknown : on ? TS.on : TS.off;
    return { ...t, chip: cx(chipBase, t.chip) };
  });

  protected readonly boards = computed(() =>
    boardFreshness(this.nodes()).map((f) => ({
      ...f,
      chip: cx(chipBase, f.stale ? stale : fresh),
      text: f.ageMs === undefined ? 'never' : `${formatAge(f.ageMs)}${f.stale ? ' · stale' : ''}`
    }))
  );
}
