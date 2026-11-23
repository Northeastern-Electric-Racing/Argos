import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from 'src/ui/recipes/tw';
import { breakNode, loopSummary } from '../../shutdown-loop.display';
import { LoopStatus, Verdict } from '../../shutdown-loop.utils';

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
/** The single culprit, inside the verdict line at the verdict's size: underlined, so it reads as the way in. */
const culpritClass = tw(
  'cursor-pointer rounded-sm border-0 bg-transparent p-0 px-1 font-black text-inherit underline decoration-2 underline-offset-4 hover:decoration-4 focus-visible:focus-ring'
);
/**
 * One chip per loop node that could be the cause, in loop order, on the orange fill: the measured break solid,
 * an unmeasured suspect hollow, a no-data loop node dashed (shape, not only words, tells them apart).
 */
const chipBase = tw(
  'inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border-2 px-3 text-lg font-bold hover:bg-surface-2 hover:text-fg focus-visible:focus-ring max-md:text-base'
);
const CHIP = {
  measured: cx(chipBase, tw('border-solid border-page bg-page text-fg')),
  unmeasured: cx(chipBase, tw('border-solid border-on-fault bg-transparent text-on-fault')),
  'no-data': cx(chipBase, tw('border-dashed border-on-fault bg-transparent text-on-fault'))
};
const warningBase = tw('flex min-h-10 items-center gap-2 rounded-md border bg-surface-1 px-3 py-1.5 text-sm');
const WARNING = {
  warn: cx(warningBase, tw('border-solid border-warn text-warn')),
  silent: cx(warningBase, tw('border-dashed border-fg-muted text-fg-label'))
};

/** The live region's text must hold this long before it is announced... */
export const ANNOUNCE_HOLD_MS = 2000;
/** ...and is announced at most this often (the latest text wins). */
export const ANNOUNCE_MIN_GAP_MS = 5000;
/** The window over which the break moving between loop nodes is counted, and how many moves make it intermittent. */
export const INTERMITTENT_WINDOW_MS = 10_000;
export const INTERMITTENT_MOVES = 3;

const andList = (labels: string[]) =>
  labels.length <= 1 ? labels[0] ?? '' : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;

/**
 * The verdict: whether the loop is open, closed or unknown, naming the culprit in the verdict line (one cause) or
 * the loop nodes that could be the cause as chips in loop order; every name selects its loop node. Below it a slot
 * that always takes the same room holds the sensor-mismatch, silent-reading and intermittent warnings (or "No
 * sensor warnings"), so nothing under the banner jumps. The visible banner follows every change; the polite live
 * region announces loopSummary() only once it has held for 2 s, at most once every 5 s.
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

  protected readonly culpritClass = culpritClass;
  protected readonly warning = WARNING;
  protected readonly verdict = computed(() => VERDICT[this.status().verdict]);
  protected readonly boxClass = computed(() => cx(boxBase, this.verdict().box));

  /** The single culprit (one suspect, no silent reading in its stretch), named in the verdict line. */
  protected readonly culprit = computed(() => {
    const s = this.status();
    return s.verdict === 'open' && s.suspects.length === 1 && s.noDataInStretch.length === 0 ? s.suspects[0] : undefined;
  });

  /** Every loop node that could be the cause, in loop order, when there is more than one. */
  protected readonly chips = computed(() => {
    const s = this.status();
    if (s.verdict !== 'open' || this.culprit()) return [];
    const stretch = new Set([...s.suspects, ...s.noDataInStretch].map((n) => n.id));
    return s.nodes
      .filter((n) => stretch.has(n.node.id))
      .map((n) => {
        const kind = n.state === 'no-data' ? 'no-data' : n.node.topic ? 'measured' : 'unmeasured';
        const tag =
          kind === 'no-data' ? 'no data' : kind === 'unmeasured' ? 'no sensor' : n.value === 0 ? 'reads 0' : 'open';
        return { id: n.node.id, label: n.node.label, kind, tag, chip: CHIP[kind] };
      });
  });

  protected readonly boards = computed(() => this.status().silentBoards.join(' and '));

  readonly mismatchText = computed(() => {
    const s = this.status();
    if (!s.mismatch) return undefined;
    const labels = s.nodes.filter((n) => n.mismatch).map((n) => n.node.label);
    return `${andList(labels)} ${labels.length === 1 ? 'reads' : 'read'} closed after the break`;
  });

  /** The measured loop nodes logic calls no-data, by name. Under UNKNOWN the title already says so. */
  protected readonly silentText = computed(() => {
    const s = this.status();
    if (s.verdict === 'unknown') return undefined;
    const silent = s.nodes.filter((n) => n.state === 'no-data' && n.node.topic);
    if (!silent.length) return undefined;
    const stale = silent.filter((n) => n.ageMs !== undefined).map((n) => n.node.label);
    const never = silent.filter((n) => n.ageMs === undefined).map((n) => n.node.label);
    const parts = [
      stale.length ? `No new reading from ${andList(stale)}` : '',
      never.length ? `${stale.length ? 'none' : 'No reading'} since the page opened from ${andList(never)}` : ''
    ].filter(Boolean);
    return `${parts.join('; ')}: skipped, which can widen the suspect stretch.`;
  });

  /** When the break has moved between loop nodes INTERMITTENT_MOVES times or more in the last 10 s. */
  protected readonly intermittentText = computed(() => {
    this.status();
    const now = Date.now();
    const recent = this.breakMoves().filter((m) => now - m.at <= INTERMITTENT_WINDOW_MS);
    if (recent.length < INTERMITTENT_MOVES) return undefined;
    const labels = [...new Set(recent.flatMap((m) => m.labels))];
    return `Intermittent: the break moved ${recent.length}× in ${INTERMITTENT_WINDOW_MS / 1000} s between ${andList(labels)}`;
  });

  /** What the live region says: loopSummary, debounced (see the class doc). */
  readonly announcement = signal('');

  private readonly breakMoves = signal<{ at: number; labels: string[] }[]>([]);
  private lastBreak: { id?: string; label?: string } | undefined;
  private pending = '';
  private announcedAt = -Infinity;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    effect(() => {
      const text = loopSummary(this.status());
      untracked(() => this.queueAnnouncement(text));
    });
    effect(() => {
      const brk = breakNode(this.status());
      untracked(() => this.recordBreak(brk?.id, brk?.label));
    });
  }

  private queueAnnouncement(text: string): void {
    if (text === this.pending && this.timer !== undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = text;
    if (!this.announcement()) {
      // The first text is the region's initial content: shown at once, not announced as a change.
      this.announcement.set(text);
      return;
    }
    if (text === this.announcement()) return;
    this.timer = setTimeout(() => this.flush(), ANNOUNCE_HOLD_MS);
  }

  private flush(): void {
    const wait = this.announcedAt + ANNOUNCE_MIN_GAP_MS - Date.now();
    if (wait > 0) {
      this.timer = setTimeout(() => this.flush(), wait);
      return;
    }
    this.timer = undefined;
    this.announcedAt = Date.now();
    this.announcement.set(this.pending);
  }

  private recordBreak(id: string | undefined, label: string | undefined): void {
    const prev = this.lastBreak;
    this.lastBreak = { id, label };
    if (!prev || prev.id === id) return;
    const now = Date.now();
    const labels = [prev.label, label].filter((l): l is string => !!l);
    this.breakMoves.update((moves) => [...moves.filter((m) => now - m.at <= INTERMITTENT_WINDOW_MS), { at: now, labels }]);
  }
}
