import { Listbox, Option } from '@angular/aria/listbox';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from 'src/ui/recipes/tw';
import {
  breakNode,
  loopOf,
  loopSummary,
  NODE_STATE_DISPLAY,
  nodeAriaLabel,
  segmentState,
  stateLabel,
  WIRE_WIDTH
} from '../../shutdown-loop.display';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { LoopNodeListboxDirective } from '../../loop-view/loop-node-listbox.directive';
import { CarLoopView } from '../../loop-view/loop-view';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';
import { CAR_BADGE_2D } from './car-view.layout';

interface Point {
  x: number;
  y: number;
}

interface Marker {
  status: NodeStatus;
  id: string;
  order: number;
  /** Where the part is (LoopNode.car), as % of the drawing. */
  anchor: Point;
  /** Where its interactive badge sits (CAR_BADGE_2D); joined to the anchor by a leader line when they differ. */
  badge: Point;
  disc: string;
  isBreak: boolean;
  ariaLabel: string;
}

interface Wire {
  key: string;
  from: Point;
  to: Point;
  state: NodeState;
  stroke: string;
  dash: string | null;
  width: number;
  /** The cause's casing: a wider line in the page colour under the core, so it reads heavier in any colour vision. */
  casing?: number;
}

/** Where the callout sits against its loop node, so it never runs off the drawing: start, centre or end. */
const CALLOUT_ALIGN = {
  start: tw('-translate-x-4'),
  center: tw('-translate-x-1/2'),
  end: tw('-translate-x-[calc(100%-16px)]')
};
/** Above its loop node, or below when the node is too near the top to fit it (18 px clears a size-7 badge). */
const CALLOUT_SIDE = { above: tw('-translate-y-[calc(100%+18px)]'), below: tw('translate-y-[18px]') };
/** Half a max-w-64 callout (128 px) as % of the 600 px `sm` drawing, rounded up: closer to an edge than this, align to it. */
const CALLOUT_EDGE_PCT = 22;
/** A callout is about 40 px tall plus its 18 px gap: about 30 % of the 321 px `sm` drawing. */
const CALLOUT_TOP_PCT = 30;

const badgeBase = tw(
  'group absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full outline-none focus-visible:z-20 focus-visible:focus-ring aria-selected:ring-3 aria-selected:ring-fg aria-selected:ring-offset-2 aria-selected:ring-offset-surface-1 data-[highlighted=true]:z-20 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-fg data-[highlighted=true]:ring-offset-2 data-[highlighted=true]:ring-offset-surface-1'
);
const discBase = tw('absolute inset-0 grid place-items-center rounded-full border-2');
const dotBase = tw('pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2');
/** Below `sm`, the highlighted loop node (or the break) is a disc with its glyph; every other one a dot. */
const overviewDisc = tw(
  'pointer-events-none absolute z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2'
);
/** A suspect's dot in the overview carries an extra ring, so the stretch reads at a glance. */
const suspectRing = tw('ring-2 ring-danger ring-offset-1 ring-offset-surface-1');

/**
 * Side view of the car frame with each loop node where it sits, joined by the loop wiring in series order (each
 * wire takes segmentState: the state just after the loop node before it). A CarLoopView (loop-view/loop-view.ts).
 *
 * From `sm` up (`interactive`) it is an Angular Aria listbox like the strip: each loop node has a small anchor dot
 * where the part is and a size-7 badge with its glyph, fanned out of the clusters (CAR_BADGE_2D) and joined to the
 * anchor by a leader line. Below `sm` the markers would be too close to tap, so it is an overview, not a control:
 * `role="img"` named with loopSummary, no tab stops, the highlighted loop node (or the break) a disc and the rest
 * dots; the strip is the control there. A callout names the highlighted loop node only.
 */
@Component({
  selector: 'car-view',
  templateUrl: './car-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [Listbox, Option, LoopNodeListboxDirective, StatusGlyphComponent, UiIconComponent]
})
export class CarViewComponent implements CarLoopView {
  readonly nodes = input.required<NodeStatus[]>();
  readonly selectedId = input<string | null>(null);
  readonly previewId = input<string | null>(null);
  /** False below `sm`: an overview, not a control (no listbox, no tab stops, no pointer events). */
  readonly interactive = input<boolean>(true);
  readonly nodeSelect = output<string | null>();
  readonly nodePreview = output<string | null>();

  protected readonly highlightId = computed(() => this.previewId() ?? this.selectedId());
  protected readonly listboxValue = computed(() => {
    const id = this.selectedId();
    return id ? [id] : [];
  });

  private readonly loop = computed(() => loopOf(this.nodes()));
  /** The accessible name of the overview (role="img"). */
  protected readonly summary = computed(() => loopSummary(this.loop()));

  protected readonly markers = computed<Marker[]>(() => {
    const loop = this.loop();
    const breakId = breakNode(loop)?.id;
    return this.nodes().map((s, i) => {
      const d = NODE_STATE_DISPLAY[s.state];
      return {
        status: s,
        id: s.node.id,
        order: i + 1,
        anchor: s.node.car,
        badge: CAR_BADGE_2D[s.node.id] ?? s.node.car,
        disc: s.node.topic ? d.marker.measured : d.marker.unmeasured,
        isBreak: s.node.id === breakId,
        ariaLabel: nodeAriaLabel(s, loop)
      };
    });
  });

  protected readonly wires = computed<Wire[]>(() => {
    const nodes = this.nodes();
    const m = this.markers();
    return m.slice(1).map((to, i) => {
      const state = segmentState(nodes, i);
      const d = NODE_STATE_DISPLAY[state];
      const width = WIRE_WIDTH[d.emphasis];
      return {
        key: `${m[i].id}-${to.id}`,
        from: m[i].anchor,
        to: to.anchor,
        state,
        stroke: d.stroke,
        dash: d.dash,
        width: width.core,
        casing: width.casing
      };
    });
  });

  /** Leader lines from each anchor to a badge that was fanned away from it. */
  protected readonly leaders = computed(() =>
    this.markers().filter((m) => Math.hypot(m.badge.x - m.anchor.x, m.badge.y - m.anchor.y) > 0.5)
  );

  /** Overview markers: the highlighted loop node, or else the break, as a disc; the others as dots. */
  protected readonly overview = computed(() => {
    const focus = this.highlightId() ?? this.markers().find((m) => m.isBreak)?.id;
    return this.markers().map((m) => ({
      ...m,
      big: m.id === focus,
      cls: m.id === focus ? cx(overviewDisc, m.disc) : cx(dotBase, m.disc, m.status.state === 'suspect' ? suspectRing : '')
    }));
  });

  protected readonly dotClass = (m: Marker) => cx(dotBase, m.disc);
  protected readonly badgeClass = badgeBase;
  protected readonly discClass = (m: Marker) => cx(discBase, m.disc);

  protected readonly callout = computed(() => {
    const m = this.markers().find((mk) => mk.id === this.highlightId());
    if (!m) return undefined;
    const at = this.interactive() ? m.badge : m.anchor;
    const d = NODE_STATE_DISPLAY[m.status.state];
    const align = at.x < CALLOUT_EDGE_PCT ? 'start' : at.x > 100 - CALLOUT_EDGE_PCT ? 'end' : 'center';
    const side = at.y < CALLOUT_TOP_PCT ? 'below' : 'above';
    return {
      ...m,
      at,
      label: m.status.node.label,
      stateLabel: stateLabel(m.status, this.loop()),
      stateText: d.text,
      align,
      side,
      cls: cx(CALLOUT_ALIGN[align], CALLOUT_SIDE[side])
    };
  });
}
