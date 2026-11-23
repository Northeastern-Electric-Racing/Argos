import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
  viewChildren
} from '@angular/core';
import { cx, tw } from 'src/ui/recipes/tw';
import { loopZones, NODE_STATE_DISPLAY, nodeAriaLabel, SHORT_LABEL, ZoneSlot } from '../../shutdown-loop.display';
import { rovingIndex } from '../../shutdown-selection.store';
import { NodeStatus } from '../../shutdown-loop.utils';
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
 * The shutdown loop laid out in series order: the page's main diagnostic read. A listbox with one option per
 * node; arrows, Home and End move through it (one tab stop), and focus selects. The suspect stretch is bracketed in
 * the cause colour, the downstream run in a dashed grey marked "not the cause". Follows the view contract in
 * ShutdownSelectionStore. Scrolls sideways when narrow, bringing the highlighted node (or the stretch) into view.
 */
@Component({
  selector: 'loop-strip',
  templateUrl: './loop-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  imports: [StatusGlyphComponent]
})
export class LoopStripComponent {
  nodes = input.required<NodeStatus[]>();
  selectedId = input<string | null>(null);
  previewId = input<string | null>(null);
  nodeSelect = output<string | null>();
  nodePreview = output<string | null>();

  protected readonly short = SHORT_LABEL;
  protected readonly ariaLabel = nodeAriaLabel;

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly itemEls = viewChildren<ElementRef<HTMLElement>>('item');

  protected readonly zones = computed(() => loopZones(this.nodes()));
  protected readonly items = computed(() => {
    const zones = this.zones();
    return this.nodes().map((s, i) => ({ s, d: NODE_STATE_DISPLAY[s.state], z: zones[i] }));
  });
  protected readonly highlightId = computed(() => this.previewId() ?? this.selectedId());
  /** The one node reachable by Tab: the selected one, else the first suspect, else the loop start. */
  protected readonly tabStopId = computed(() => {
    const nodes = this.nodes();
    return this.selectedId() ?? nodes.find((s) => s.state === 'suspect')?.node.id ?? nodes[0]?.node.id;
  });
  private readonly scrollTargetId = computed(() => {
    const nodes = this.nodes();
    const stretch = this.zones().findIndex((z) => z.zone === 'stretch');
    return this.highlightId() ?? (stretch >= 0 ? nodes[stretch].node.id : null);
  });

  constructor() {
    afterRenderEffect(() => {
      const id = this.scrollTargetId();
      if (id) this.scrollIntoView(id);
    });
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

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const { id } = this.nodes()[index].node;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.nodeSelect.emit(id);
      return;
    }
    if (event.key === 'Escape') {
      this.nodeSelect.emit(null);
      return;
    }
    const next = rovingIndex(event.key, index, this.nodes().length);
    if (next === undefined) return;
    event.preventDefault();
    this.itemEls()[next]?.nativeElement.focus();
  }

  /** Scrolls the strip (never the page) so the node is in view, if it is not already. */
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
