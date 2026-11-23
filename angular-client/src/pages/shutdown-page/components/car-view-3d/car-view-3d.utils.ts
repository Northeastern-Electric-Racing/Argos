import { NODE_STATE_DISPLAY } from '../../shutdown-loop.display';
import { LoopNode } from '../../shutdown-loop.model';
import { NODE_ANCHOR_PREFIX, Vec3 } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';

// Pure logic for the 3D car view. Nothing here imports three, so it is cheap to test and to load.

export type ViewPreset = 'side' | 'top' | 'iso';
/** How the car model is painted: its own (CAD) colours, a theme grey, or a see-through theme grey. */
export type MaterialMode = 'cad' | 'theme' | 'ghost';
export type MarkerShape = 'sphere' | 'octahedron' | 'cone' | 'box';
export type PositionSource = 'model' | 'table';
export type StateColours = Record<NodeState, string>;

/** A named node found in the model, with its position in model space (metres). */
export interface NodeAnchor {
  name: string;
  position: Vec3;
}
export interface ResolvedPositions {
  positions: Map<string, { position: Vec3; source: PositionSource }>;
  /** Loop nodes with neither an anchor in the model nor a table entry; they are not drawn. */
  missing: string[];
  /** Anchors named like a shutdown node whose id is not in the loop (typos in CAD). */
  unknownAnchors: string[];
}

const ANCHOR_RE = new RegExp(`^${NODE_ANCHOR_PREFIX.slice(0, -1)}[:_](.+?)(?:\\.\\d+)?$`, 'i');

/**
 * The loop node id a model node's name marks, or undefined. Accepts `shutdown:<id>` as documented, and
 * the forms exporters turn it into: `shutdown_<id>` with underscores for hyphens, any case, and Blender's
 * `.001` duplicate suffix.
 */
export function parseNodeAnchorName(name: string): string | undefined {
  const match = ANCHOR_RE.exec(name.trim());
  return match ? match[1].toLowerCase().replace(/_/g, '-') : undefined;
}

/** Each node's position: a named empty in the model wins over the table; the first anchor for an id wins. */
export function resolveNodePositions(
  nodes: readonly LoopNode[],
  table: Readonly<Record<string, Vec3>>,
  anchors: readonly NodeAnchor[]
): ResolvedPositions {
  const ids = new Set(nodes.map((n) => n.id));
  const fromModel = new Map<string, Vec3>();
  const unknownAnchors: string[] = [];
  for (const anchor of anchors) {
    const id = parseNodeAnchorName(anchor.name);
    if (id === undefined) continue;
    if (!ids.has(id)) unknownAnchors.push(anchor.name);
    else if (!fromModel.has(id)) fromModel.set(id, anchor.position);
  }

  const positions: ResolvedPositions['positions'] = new Map();
  const missing: string[] = [];
  for (const { id } of nodes) {
    const model = fromModel.get(id);
    const tablePos = table[id];
    if (model) positions.set(id, { position: model, source: 'model' });
    else if (tablePos) positions.set(id, { position: tablePos, source: 'table' });
    else missing.push(id);
  }
  return { positions, missing, unknownAnchors };
}

/** shutdown-states.css values, used when the stylesheet's colours can't be read (tests, odd browsers). */
export const FALLBACK_STATE_COLOURS: StateColours = {
  closed: '#2fd35a',
  suspect: '#ff4d4d',
  'downstream-open': '#8a8a8a',
  'no-data': '#8b93a1'
};

/**
 * Each state's colour, read through the same class the 2D view uses (NODE_STATE_DISPLAY[state].cssClass),
 * so the 3D view follows shutdown-states.css. `read` returns the `--sd-color` an element with that class gets.
 */
export function resolveStateColours(read: (cssClass: string) => string | null | undefined): StateColours {
  const colours = { ...FALLBACK_STATE_COLOURS };
  for (const state of Object.keys(NODE_STATE_DISPLAY) as NodeState[]) {
    const value = read(NODE_STATE_DISPLAY[state].cssClass)?.trim();
    if (value) colours[state] = value;
  }
  return colours;
}

/** strong = the cause, muted = open only because of upstream or unknown; drawn thick / thin. */
export type SegmentEmphasis = 'strong' | 'normal' | 'muted';
export interface LoopSegment3d {
  key: string;
  from: Vec3;
  to: Vec3;
  state: NodeState;
  colour: string;
  emphasis: SegmentEmphasis;
}

const EMPHASIS: Record<NodeState, SegmentEmphasis> = {
  closed: 'normal',
  suspect: 'strong',
  'downstream-open': 'muted',
  'no-data': 'muted'
};

/**
 * The loop wiring as segments between consecutive nodes in series order. Each segment takes the state of
 * the node it leaves, as the 2D view's polyline does. Pairs with an unplaced end are skipped.
 */
export function loopSegments(
  statuses: readonly NodeStatus[],
  positions: ResolvedPositions['positions'],
  colours: StateColours
): LoopSegment3d[] {
  const segments: LoopSegment3d[] = [];
  for (let i = 0; i + 1 < statuses.length; i++) {
    const from = statuses[i];
    const to = statuses[i + 1];
    const a = positions.get(from.node.id);
    const b = positions.get(to.node.id);
    if (!a || !b) continue;
    segments.push({
      key: `${from.node.id}-${to.node.id}`,
      from: a.position,
      to: b.position,
      state: from.state,
      colour: colours[from.state],
      emphasis: EMPHASIS[from.state]
    });
  }
  return segments;
}

/** One shape per state, so markers read apart without colour (WCAG 1.4.1). */
export const MARKER_SHAPES: Record<NodeState, MarkerShape> = {
  closed: 'sphere',
  suspect: 'octahedron',
  'downstream-open': 'cone',
  'no-data': 'box'
};

export interface MarkerStyle {
  shape: MarkerShape;
  /** Unmeasured nodes (no sensor) are drawn as wireframes, like the 2D view's hollow markers. */
  hollow: boolean;
  colour: string;
}

export function markerStyle(status: NodeStatus, colours: StateColours): MarkerStyle {
  return { shape: MARKER_SHAPES[status.state], hollow: !status.node.topic, colour: colours[status.state] };
}

export interface NodeDetail {
  stateLabel: string;
  topic: string;
  value: string;
  age: string;
}

/** Text for the selected node's detail panel. */
export function nodeDetail(s: NodeStatus): NodeDetail {
  const stateLabel = NODE_STATE_DISPLAY[s.state].label;
  if (!s.node.topic) return { stateLabel, topic: 'no sensor', value: '—', age: '—' };
  if (s.state === 'no-data' || s.value === undefined || s.ageMs === undefined) {
    return { stateLabel, topic: s.node.topic, value: 'no data', age: '—' };
  }
  return {
    stateLabel,
    topic: s.node.topic,
    value: `${s.value} (${s.value ? 'closed' : 'open'})`,
    age: `${Math.round(s.ageMs / 1000)} s ago`
  };
}

/**
 * Scale that brings a model to metres, guessed from its largest dimension: a car is a few metres long, so a
 * size in the hundreds is centimetres and in the thousands millimetres (common for CAD exports).
 */
export function unitScaleFor(maxDimension: number): number {
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) return 1;
  if (maxDimension > 1000) return 0.001;
  if (maxDimension > 50) return 0.01;
  return 1;
}

/** Camera distance at which a sphere of `radius` fits the narrower of the vertical and horizontal fields of view. */
export function fitDistance(radius: number, verticalFovDeg: number, aspect: number, margin = 1.15): number {
  const vHalf = (verticalFovDeg * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  return (radius / Math.sin(Math.min(vHalf, hHalf))) * margin;
}

/**
 * Direction from the target to the camera per preset, in model space. Side looks at the car's left so the
 * nose points left, as in the 2D view.
 */
export const VIEW_DIRECTIONS: Record<ViewPreset, Vec3> = {
  side: [0, 0.05, -1],
  top: [0, 1, -0.001],
  iso: [0.8, 0.7, -1]
};

/** The id of the visible point nearest (x, y), if one is within `reach` pixels. */
export function nearestPoint(
  points: readonly { id: string; x: number; y: number; visible: boolean }[],
  x: number,
  y: number,
  reach: number
): string | null {
  let best: string | null = null;
  let bestDist = reach;
  for (const p of points) {
    if (!p.visible) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestDist) {
      best = p.id;
      bestDist = d;
    }
  }
  return best;
}

export function isWebGLAvailable(doc: Pick<Document, 'createElement'>): boolean {
  try {
    const canvas = doc.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export type FallbackReason = 'webgl' | 'model' | 'init';

/** Thrown by the scene: no WebGL context could be made, or the model failed to load or parse. */
export class CarSceneError extends Error {
  constructor(
    readonly kind: 'webgl' | 'model',
    options?: { cause?: unknown }
  ) {
    super(kind === 'webgl' ? 'WebGL is unavailable' : 'The car model could not be loaded', options);
    this.name = 'CarSceneError';
  }
}

export function fallbackReasonFor(error: unknown): FallbackReason {
  return error instanceof CarSceneError ? error.kind : 'init';
}

export const FALLBACK_NOTICES: Record<FallbackReason, string> = {
  webgl: 'The 3D view needs WebGL, which this browser has turned off. Showing the 2D view.',
  model: 'The car model (assets/models/car.glb) is missing or could not be read. Showing the 2D view.',
  init: 'The 3D view failed to start. Showing the 2D view.'
};

export type CarViewMode = '2d' | '3d';
export const VIEW_MODE_KEY = 'shutdown-car-view';

/** The stored 2D/3D choice; 3D when nothing (valid) is stored or storage is blocked. */
export function readViewMode(storage: () => Pick<Storage, 'getItem'>): CarViewMode {
  try {
    return storage().getItem(VIEW_MODE_KEY) === '2d' ? '2d' : '3d';
  } catch {
    return '3d';
  }
}

export function writeViewMode(storage: () => Pick<Storage, 'setItem'>, mode: CarViewMode): void {
  try {
    storage().setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}
