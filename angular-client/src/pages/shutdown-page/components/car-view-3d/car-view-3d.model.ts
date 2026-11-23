import { NODE_STATE_DISPLAY, PLACEHOLDER_TAG } from '../../shutdown-loop.display';
import { CarPoint3d } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';

/**
 * The 3D car view's pure parts: what to draw for the loop, and the text for a selected node. No three.js
 * here, so the page's first load doesn't pull it in and all of this is unit-testable in jsdom.
 */

export type ViewPreset = 'side' | 'top' | 'iso';
export const VIEW_PRESETS: readonly { id: ViewPreset; label: string }[] = [
  { id: 'iso', label: 'Iso' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' }
];

/** Camera position and orbit target per preset, in car metres (see CarPoint3d). */
export const CAMERA_PRESETS: Record<ViewPreset, { position: CarPoint3d; target: CarPoint3d }> = {
  iso: { position: { x: -1.2, y: 1.9, z: 2.9 }, target: { x: 1.0, y: 0.38, z: 0 } },
  side: { position: { x: 1.0, y: 0.55, z: 4.1 }, target: { x: 1.0, y: 0.45, z: 0 } },
  top: { position: { x: 1.0, y: 4.4, z: 0.001 }, target: { x: 1.0, y: 0.3, z: 0 } }
};

export type MarkerShape = 'sphere' | 'octahedron' | 'cone' | 'cube';
/** One shape per state, mirroring the strip's glyphs: ok ball, sharp X-like octahedron, down cone, unknown cube. */
export const MARKER_SHAPE: Record<NodeState, MarkerShape> = {
  closed: 'sphere',
  suspect: 'octahedron',
  'downstream-open': 'cone',
  'no-data': 'cube'
};

/** States whose wire carries no voltage: drawn dashed, as in the 2D view. */
const DASHED_STATES: ReadonlySet<NodeState> = new Set<NodeState>(['downstream-open', 'no-data']);

export interface LoopSegment3d {
  key: string;
  from: CarPoint3d;
  to: CarPoint3d;
  state: NodeState;
  cssClass: string;
  dashed: boolean;
}

export interface Marker3d {
  id: string;
  order: number;
  position: CarPoint3d;
  state: NodeState;
  cssClass: string;
  shape: MarkerShape;
  /** Unmeasured (no sensor): drawn as a wireframe. */
  hollow: boolean;
}

type Positions = Readonly<Record<string, CarPoint3d>>;

/**
 * The loop wire, node to node in series order. Each segment takes the state of the node it leaves, like the
 * 2D view's polyline, so the wire goes red from the last known-closed point and muted after the break.
 */
export function buildLoopSegments(nodes: readonly NodeStatus[], positions: Positions): LoopSegment3d[] {
  const segments: LoopSegment3d[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const from = positions[a.node.id];
    const to = positions[b.node.id];
    if (!from || !to) continue;
    segments.push({
      key: `${a.node.id}-${b.node.id}`,
      from,
      to,
      state: a.state,
      cssClass: NODE_STATE_DISPLAY[a.state].cssClass,
      dashed: DASHED_STATES.has(a.state)
    });
  }
  return segments;
}

export function buildMarkers(nodes: readonly NodeStatus[], positions: Positions): Marker3d[] {
  const markers: Marker3d[] = [];
  nodes.forEach((s, i) => {
    const position = positions[s.node.id];
    if (!position) return;
    markers.push({
      id: s.node.id,
      order: i + 1,
      position,
      state: s.state,
      cssClass: NODE_STATE_DISPLAY[s.state].cssClass,
      shape: MARKER_SHAPE[s.state],
      hollow: !s.node.topic
    });
  });
  return markers;
}

/** Splits the line from `from` to `to` into dashes of length `dash` separated by `gap`; the last may be shorter. */
export function dashPieces(from: CarPoint3d, to: CarPoint3d, dash: number, gap: number): [CarPoint3d, CarPoint3d][] {
  const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  if (length === 0 || dash <= 0) return [];
  const at = (d: number): CarPoint3d => {
    const t = Math.min(d, length) / length;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t };
  };
  const pieces: [CarPoint3d, CarPoint3d][] = [];
  // A small epsilon so floating error at the end doesn't add a zero-length dash.
  for (let d = 0; d < length - 1e-9; d += dash + gap) pieces.push([at(d), at(d + dash)]);
  return pieces;
}

export interface NodeInfo {
  id: string;
  order: number;
  label: string;
  state: string;
  topic: string;
  value: string;
  age: string;
  notes: string[];
}

/** The selected node's details: label, state, topic, value and age, as the 2D view's tooltip has them. */
export function nodeInfo(s: NodeStatus, order = 0): NodeInfo {
  const { id, label, topic, placeholder } = s.node;
  const live = topic && s.state !== 'no-data' && s.value !== undefined && s.ageMs !== undefined;
  const notes: string[] = [];
  if (placeholder) notes.push(PLACEHOLDER_TAG);
  if (s.mismatch) notes.push('mismatch: reads closed after the break');
  return {
    id,
    order,
    label,
    state: NODE_STATE_DISPLAY[s.state].label,
    topic: topic ?? 'no sensor',
    value: !topic ? '—' : live ? String(s.value) : 'no data',
    age: live ? `${Math.round(s.ageMs! / 1000)} s ago` : '—',
    notes
  };
}

/** What the scene draws depends only on each node's state and mismatch flag, not on ages ticking. */
export function sceneSignature(nodes: readonly NodeStatus[]): string {
  return nodes.map((s) => `${s.node.id}:${s.state}:${s.mismatch ? 1 : 0}`).join('|');
}

/** True if this browser can create a WebGL context (WebGL 2 preferred). */
export function isWebGLAvailable(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
