import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NODE_STATE_DISPLAY } from '../../shutdown-loop.display';
import { NodeStatus } from '../../shutdown-loop.utils';

/** viewBox is 1000 x 535 (frame image aspect); node `car` coords are % of that. */
const VIEW_W = 1000;
const VIEW_H = 535;

interface Marker {
  id: string;
  order: number;
  x: number;
  y: number;
  cssClass: string;
  unmeasured: boolean;
  ariaLabel: string;
  tooltip: string;
}

interface Segment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cssClass: string;
}

const tooltipFor = (s: NodeStatus): string => {
  const { label, topic } = s.node;
  if (!topic) return `${label} · no sensor`;
  if (s.value === undefined || s.ageMs === undefined || s.state === 'no-data') return `${label} · ${topic} · no data`;
  return `${label} · ${topic} = ${s.value} · ${Math.round(s.ageMs / 1000)} s ago`;
};

/** Side view of the car frame with each shutdown node where it sits, joined in loop order. */
@Component({
  selector: 'car-view',
  templateUrl: './car-view.component.html',
  styleUrls: ['../../shutdown-states.css', './car-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarViewComponent {
  nodes = input.required<NodeStatus[]>();

  readonly markers = computed<Marker[]>(() =>
    this.nodes().map((s, i) => ({
      id: s.node.id,
      order: i + 1,
      x: (s.node.car.x / 100) * VIEW_W,
      y: (s.node.car.y / 100) * VIEW_H,
      cssClass: NODE_STATE_DISPLAY[s.state].cssClass,
      unmeasured: !s.node.topic,
      ariaLabel: `${s.node.label}: ${NODE_STATE_DISPLAY[s.state].label}`,
      tooltip: tooltipFor(s)
    }))
  );

  readonly segments = computed<Segment[]>(() => {
    const m = this.markers();
    return m.slice(1).map((to, i) => ({
      key: `${m[i].id}-${to.id}`,
      x1: m[i].x,
      y1: m[i].y,
      x2: to.x,
      y2: to.y,
      cssClass: m[i].cssClass
    }));
  });
}
