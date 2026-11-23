import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  untracked,
  viewChild,
  viewChildren
} from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from 'src/ui/recipes/tw';
import {
  loopOf,
  loopZones,
  NODE_STATE_DISPLAY,
  nodeAriaLabel,
  PLACEHOLDER_TAG,
  segmentState,
  SHORT_LABEL,
  shortStateLabel,
  WireEmphasis,
  ZoneSlot
} from '../../shutdown-loop.display';
import { NodeStatus } from '../../shutdown-loop.utils';
import { LoopNodeListboxDirective } from '../../loop-view/loop-node-listbox.directive';
import { LoopView } from '../../loop-view/loop-view';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';

/** The bracket drawn over a zone, per position: legs only at its ends. */
const bracketBase = tw('pointer-events-none absolute -top-3 h-2.5 border-t-2');
const bracketZone = {
  stretch: tw('border-solid border-danger'),
  downstream: tw('border-dashed border-fg-dim')
};
const bracketStart = tw('left-1 rounded-tl-sm border-l-2');
const bracketMid = tw('-left-0.5');
const bracketEnd = tw('right-1 rounded-tr-sm border-r-2');
const bracketMidEnd = tw('-right-0.5');
/** The stretch is named from its start (left), the downstream run from its end (right), so the two never collide. */
const bracketLabelBase = tw('pointer-events-none absolute -top-8 text-xs leading-none font-bold whitespace-nowrap');
const bracketLabelZone = {
  stretch: tw('left-1 text-danger'),
  downstream: tw('right-1 text-fg-muted')
};
/**
 * The wire from a loop node's centre to the next one's: top-6 is the disc's centre (pt-1.5 + half of size-9), and
 * 100% + 4px spans the item plus its 2 px borders on both sides. Its weight follows the state's emphasis.
 */
const wireBase = tw('pointer-events-none absolute top-6 left-1/2 z-1 h-0 w-[calc(100%+4px)] -translate-y-1/2');
const WIRE_WEIGHT: Record<WireEmphasis, string> = {
  strong: tw('border-t-5'),
  normal: tw('border-t-3'),
  muted: tw('border-t-2')
};
/** A loop node that reads closed after the break: a warn ring on its disc, as well as its badge and words. */
const mismatchRing = tw('ring-2 ring-warn ring-offset-2 ring-offset-surface-1');

/** How long after the user scrolls or presses on the strip it stops following the suspect stretch by itself. */
export const USER_SCROLL_HOLD_MS = 5000;

/**
 * The shutdown loop laid out in series order: the page's main diagnostic read. An Angular Aria listbox (explicit
 * selection) with one option per loop node, bridged to LoopView by loopNodeListbox: arrows, Home and End move focus
 * (one tab stop) and preview, click, Enter or Space toggle the pin, Escape clears it. The suspect stretch is
 * bracketed in the cause colour, the downstream run in a dashed grey marked "not the cause". A LoopView
 * (loop-view/loop-view.ts). From `lg` every loop node fits; narrower it scrolls sideways, following the pinned loop
 * node (unless the pointer is on the strip) and the start of the suspect stretch (unless the user has just
 * scrolled it). Never on a preview: hovering never moves what is under the pointer.
 */
@Component({
  selector: 'loop-strip',
  templateUrl: './loop-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  imports: [Listbox, Option, LoopNodeListboxDirective, StatusGlyphComponent, UiIconComponent]
})
export class LoopStripComponent implements LoopView {
  readonly nodes = input.required<NodeStatus[]>();
  readonly selectedId = input<string | null>(null);
  readonly previewId = input<string | null>(null);
  /** Ids of the elements that describe the strip (the page's hint), for aria-describedby. */
  readonly describedBy = input<string>('');
  readonly nodeSelect = output<string | null>();
  readonly nodePreview = output<string | null>();

  protected readonly short = SHORT_LABEL;
  /** PLACEHOLDER_TAG on two lines, so it fits a strip column. */
  protected readonly placeholderLines = PLACEHOLDER_TAG.split(' — ');
  /** Whether the pointer is over the scroller; set from its pointer events. */
  protected pointerOver = false;
  private userScrolledAt = -Infinity;

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly itemEls = viewChildren<ElementRef<HTMLElement>>('item');

  protected readonly listboxValue = computed(() => {
    const id = this.selectedId();
    return id ? [id] : [];
  });
  protected readonly zones = computed(() => loopZones(this.nodes()));
  protected readonly items = computed(() => {
    const nodes = this.nodes();
    const zones = this.zones();
    const loop = loopOf(nodes);
    return nodes.map((s, i) => {
      const d = NODE_STATE_DISPLAY[s.state];
      const wireState = i < nodes.length - 1 ? segmentState(nodes, i) : s.state;
      const w = NODE_STATE_DISPLAY[wireState];
      return {
        s,
        z: zones[i],
        disc: cx(s.node.topic ? d.marker.measured : d.marker.unmeasured, s.mismatch ? mismatchRing : ''),
        // The cause and suspects in bold; the rest quieter (and smaller where 19 columns share the width at lg).
        stateText: cx(
          s.mismatch ? tw('text-warn') : d.text,
          s.state === 'suspect' || s.mismatch ? tw('font-bold') : tw('font-medium lg:text-badge')
        ),
        wire: { state: wireState, class: cx(wireBase, w.connector, WIRE_WEIGHT[w.emphasis]) },
        ariaLabel: nodeAriaLabel(s, loop),
        stateShort: shortStateLabel(s, loop)
      };
    });
  });
  protected readonly highlightId = computed(() => this.previewId() ?? this.selectedId());
  /** The first loop node of the suspect stretch, which the strip keeps in view while the user is not scrolling it. */
  private readonly stretchStartId = computed(() => {
    const start = this.zones().findIndex((z) => z.zone === 'stretch');
    return start >= 0 ? this.nodes()[start].node.id : null;
  });

  constructor() {
    afterRenderEffect(() => {
      const id = this.selectedId();
      untracked(() => {
        if (id && !this.pointerOver) this.scrollIntoView(id);
      });
    });
    afterRenderEffect(() => {
      const id = this.stretchStartId();
      untracked(() => {
        if (id && Date.now() - this.userScrolledAt > USER_SCROLL_HOLD_MS) this.scrollIntoView(id);
      });
    });
  }

  protected userScrolled(): void {
    this.userScrolledAt = Date.now();
  }

  protected bracketClass(z: ZoneSlot): string {
    if (!z.zone) return '';
    return cx(bracketBase, bracketZone[z.zone], z.start ? bracketStart : bracketMid, z.end ? bracketEnd : bracketMidEnd);
  }

  protected bracketLabelClass(z: ZoneSlot): string {
    return z.zone ? cx(bracketLabelBase, bracketLabelZone[z.zone]) : '';
  }

  protected bracketLabel(z: ZoneSlot): string {
    if (z.zone === 'downstream') return 'Not the cause';
    return z.end ? 'Broke the loop' : 'Suspect stretch';
  }

  /** Scrolls the strip (never the page) so the loop node is in view, if it is not already. */
  private scrollIntoView(id: string): void {
    const scroller = this.scroller().nativeElement;
    const item = this.itemEls().find((i) => i.nativeElement.dataset['nodeId'] === id)?.nativeElement;
    if (!item || scroller.scrollWidth <= scroller.clientWidth) return;
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    if (left >= scroller.scrollLeft && right <= scroller.scrollLeft + scroller.clientWidth) return;
    scroller.scrollLeft = Math.max(0, left - scroller.clientWidth / 3);
  }
}
