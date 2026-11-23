import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChildren } from '@angular/core';
import { tw } from 'src/ui/recipes/tw';
import { NODE_STATE_DISPLAY, nodeAriaLabel } from '../../shutdown-loop.display';
import { rovingIndex } from '../../shutdown-selection.store';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';

interface Marker {
  status: NodeStatus;
  id: string;
  order: number;
  /** Position as % of the drawing (the node's `car` coordinates). */
  x: number;
  y: number;
  disc: string;
  ariaLabel: string;
}

interface Segment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  state: NodeState;
  stroke: string;
  dash: string | null;
  width: number;
}

/** Where the callout sits against its marker, so it never runs off the drawing. */
const CALLOUT_ALIGN = {
  start: tw('-translate-x-4'),
  center: tw('-translate-x-1/2'),
  end: tw('-translate-x-[calc(100%-16px)]')
};

/**
 * Side view of the car frame with each shutdown node where it sits, joined by the loop wiring in series order. Each
 * segment takes the state of the node before it (the loop voltage just after that node). Markers are HTML over the
 * drawing, so they keep their size and focus ring at any width; the wiring is SVG with non-scaling strokes.
 * Follows the view contract in ShutdownSelectionStore (nodes, selectedId, previewId, nodeSelect, nodePreview), which a
 * 3D car view can implement the same way. A callout names the highlighted node, or the break while nothing is.
 */
@Component({
  selector: 'car-view',
  templateUrl: './car-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [StatusGlyphComponent]
})
export class CarViewComponent {
  nodes = input.required<NodeStatus[]>();
  selectedId = input<string | null>(null);
  previewId = input<string | null>(null);
  nodeSelect = output<string | null>();
  nodePreview = output<string | null>();

  private readonly markerEls = viewChildren<ElementRef<HTMLElement>>('marker');

  protected readonly highlightId = computed(() => this.previewId() ?? this.selectedId());

  protected readonly markers = computed<Marker[]>(() =>
    this.nodes().map((s, i) => {
      const d = NODE_STATE_DISPLAY[s.state];
      return {
        status: s,
        id: s.node.id,
        order: i + 1,
        x: s.node.car.x,
        y: s.node.car.y,
        disc: s.node.topic ? d.marker.measured : d.marker.unmeasured,
        ariaLabel: nodeAriaLabel(s)
      };
    })
  );

  protected readonly segments = computed<Segment[]>(() => {
    const m = this.markers();
    return m.slice(1).map((to, i) => {
      const { state } = m[i].status;
      const d = NODE_STATE_DISPLAY[state];
      return {
        key: `${m[i].id}-${to.id}`,
        x1: m[i].x,
        y1: m[i].y,
        x2: to.x,
        y2: to.y,
        state,
        stroke: d.stroke,
        dash: d.dash,
        width: state === 'suspect' ? 4 : 3
      };
    });
  });

  /** The one marker reachable by Tab: the selected one, else the first suspect, else the loop start. */
  protected readonly tabStopId = computed(() => {
    const nodes = this.nodes();
    return this.selectedId() ?? nodes.find((s) => s.state === 'suspect')?.node.id ?? nodes[0]?.node.id;
  });

  protected readonly callout = computed(() => {
    const markers = this.markers();
    // The break is the last suspect: the first open reading.
    const id =
      this.highlightId() ??
      this.nodes()
        .filter((s) => s.state === 'suspect')
        .at(-1)?.node.id;
    const m = markers.find((mk) => mk.id === id);
    if (!m) return undefined;
    const d = NODE_STATE_DISPLAY[m.status.state];
    const align = m.x < 15 ? CALLOUT_ALIGN.start : m.x > 85 ? CALLOUT_ALIGN.end : CALLOUT_ALIGN.center;
    return { ...m, label: m.status.node.label, stateLabel: d.label, stateText: d.text, align };
  });

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
    this.markerEls()[next]?.nativeElement.focus();
  }
}
