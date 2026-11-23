import { NODE_STATE_DISPLAY, segmentState, SHORT_LABEL, WIRE_WIDTH, WireEmphasis } from '../../shutdown-loop.display';
import { LoopNode } from '../../shutdown-loop.model';
import { NODE_ANCHOR_PREFIX, Vec3 } from '../../shutdown-loop.positions-3d';
import { ThemeColourToken } from '../../shutdown-loop.theme';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';

// Pure logic for the glTF 3D car view. Nothing here imports three, so it is cheap to test and to load.

/** How the car model is painted: its own colours, a solid theme grey, or a see-through theme grey. */
export type MaterialMode = 'original' | 'solid' | 'see-through';
export const MATERIAL_MODES: readonly { id: MaterialMode; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'solid', label: 'Solid' },
  { id: 'see-through', label: 'See-through' }
];
export type MarkerShape = 'sphere' | 'octahedron' | 'cone' | 'box';
export type StateColours = Record<NodeState, string>;

/** Neutral theme tokens for the scene itself; state colours come from readStateColours. */
export const SCENE_COLOR_TOKENS = {
  body: '--color-border-strong',
  ghost: '--color-fg-muted',
  grid: '--color-border',
  highlight: '--color-fg',
  mismatch: '--color-warn'
} as const satisfies Record<string, ThemeColourToken>;
export type SceneColours = Record<keyof typeof SCENE_COLOR_TOKENS, string>;

// ---------------------------------------------------------------------------------------------------------------
// Model anchors and units

const ANCHOR_RE = new RegExp(`^${NODE_ANCHOR_PREFIX.slice(0, -1)}[:_](.+?)(?:\\.\\d+)?$`, 'i');

/**
 * The loop node id a model node's authored name marks, or undefined. Accepts `shutdown:<id>` as documented, and
 * the forms exporters turn it into: `shutdown_<id>` with underscores for hyphens, any case, and Blender's `.001`
 * duplicate suffix. A parsed id is only an anchor if it is a loop node id (prepareModel checks).
 */
export function parseNodeAnchorName(name: string): string | undefined {
  const match = ANCHOR_RE.exec(name.trim());
  return match ? match[1].toLowerCase().replace(/_/g, '-') : undefined;
}

/** Named exactly as documented (`shutdown:`), so an unknown id after it is a typo worth reporting. */
export const hasExactAnchorPrefix = (name: string) => name.startsWith(NODE_ANCHOR_PREFIX);

export interface ResolvedPositions {
  positions: Map<string, { position: Vec3; source: 'model' | 'table' }>;
  /** Loop nodes with neither an anchor in the model nor a table entry; they are not drawn. */
  missing: string[];
}

/** Each loop node's position: an anchor in the model wins over the table. */
export function resolveNodePositions(
  nodes: readonly LoopNode[],
  table: Readonly<Record<string, Vec3>>,
  anchors: ReadonlyMap<string, Vec3> = new Map()
): ResolvedPositions {
  const positions: ResolvedPositions['positions'] = new Map();
  const missing: string[] = [];
  for (const { id } of nodes) {
    const model = anchors.get(id);
    if (model) positions.set(id, { position: model, source: 'model' });
    else if (table[id]) positions.set(id, { position: table[id], source: 'table' });
    else missing.push(id);
  }
  return { positions, missing };
}

/** Unit scales a CAD export may need: metres, centimetres, millimetres, inches. */
const UNIT_SCALES = [1, 0.01, 0.001, 0.0254] as const;
const CAR_LENGTH_M = 3;
const CAR_LENGTH_RANGE_M = [1.5, 6] as const;

/**
 * The scale that brings a model to metres, guessed from its largest dimension: the unit that makes it closest to a
 * 3 m car, if that lands between 1.5 m and 6 m. `fits` is false (and the scale 1) when no unit does.
 */
export function unitScaleFor(maxDimension: number): { scale: number; fits: boolean } {
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) return { scale: 1, fits: false };
  const [lo, hi] = CAR_LENGTH_RANGE_M;
  let best: number | undefined;
  for (const scale of UNIT_SCALES) {
    const length = maxDimension * scale;
    if (length < lo || length > hi) continue;
    if (best === undefined || Math.abs(length - CAR_LENGTH_M) < Math.abs(maxDimension * best - CAR_LENGTH_M)) best = scale;
  }
  return best === undefined ? { scale: 1, fits: false } : { scale: best, fits: true };
}

/** The one console line a model load writes, so placement can be checked without a debugger. */
export function modelSummary(s: {
  file: string;
  total: number;
  anchored: readonly string[];
  scale: number;
  unknownAnchors: readonly string[];
}): string {
  const from = s.anchored.length ? ` (${s.anchored.join(', ')})` : '';
  const unknown = s.unknownAnchors.length ? s.unknownAnchors.join(', ') : 'none';
  return `${s.file}: ${s.anchored.length}/${s.total} loop nodes from anchors${from}, scale ×${s.scale}, unknown: ${unknown}`;
}

// ---------------------------------------------------------------------------------------------------------------
// What the scene draws, reduced to what changes its pixels

/** One shape per state, so markers read apart without colour (WCAG 1.4.1). */
export const MARKER_SHAPES: Record<NodeState, MarkerShape> = {
  closed: 'sphere',
  suspect: 'octahedron',
  'downstream-open': 'cone',
  'no-data': 'box'
};

/** A loop node as the scene draws it: no value or age, which change every tick without changing a pixel. */
export interface SceneNode {
  id: string;
  state: NodeState;
  /** Has a sensor of its own; unmeasured markers are wireframes, like the 2D view's hollow markers. */
  measured: boolean;
  mismatch: boolean;
}
export interface SceneStatus {
  nodes: SceneNode[];
  /** segments[i] is the state of the wire from nodes[i] to nodes[i + 1] (segmentState, shared with 2D). */
  segments: NodeState[];
}

export function sceneStatus(nodes: readonly NodeStatus[]): SceneStatus {
  return {
    nodes: nodes.map((s) => ({ id: s.node.id, state: s.state, measured: !!s.node.topic, mismatch: s.mismatch })),
    segments: nodes.slice(0, -1).map((_, i) => segmentState(nodes, i))
  };
}

/** Equality for a `computed` of sceneStatus, so ticks that change only values or ages never reach three. */
export function sameSceneStatus(a: SceneStatus, b: SceneStatus): boolean {
  return (
    a.nodes.length === b.nodes.length &&
    a.segments.length === b.segments.length &&
    a.nodes.every((n, i) => markerKey(n) === markerKey(b.nodes[i]) && n.id === b.nodes[i].id) &&
    a.segments.every((s, i) => s === b.segments[i])
  );
}

/** Everything that changes a marker's look. */
export const markerKey = (n: SceneNode) =>
  `${MARKER_SHAPES[n.state]}|${n.state}|${n.measured ? 'solid' : 'hollow'}|${n.mismatch}`;

export interface SegmentStyle {
  emphasis: WireEmphasis;
  /** Tube radius in metres: half of the 2D core width (WIRE_WIDTH), so 3D wires weigh what 2D wires do. */
  radius: number;
  /** [dash, gap] in metres, or null for a solid wire. */
  dash: readonly [number, number] | null;
}

/** Metres per SVG user unit when the 2D wire language (dash pattern, WIRE_WIDTH) is drawn as 3D tubes. */
export const SVG_UNIT_M = 0.006;

/** A wire's style from its state, in the same language as 2D: NODE_STATE_DISPLAY's emphasis and dash pattern. */
export function segmentStyle(state: NodeState): SegmentStyle {
  const { emphasis, dash } = NODE_STATE_DISPLAY[state];
  const parts = dash?.split(/[\s,]+/).map(Number) ?? [];
  const valid = parts.length >= 2 && parts.every((n) => Number.isFinite(n) && n > 0);
  return {
    emphasis,
    radius: (WIRE_WIDTH[emphasis].core / 2) * SVG_UNIT_M,
    dash: valid ? [parts[0] * SVG_UNIT_M, parts[1] * SVG_UNIT_M] : null
  };
}

/** Everything that changes a wire's look. */
export const segmentKey = (state: NodeState) => {
  const { emphasis, dash } = segmentStyle(state);
  return `${state}|${emphasis}|${dash?.join(',') ?? 'solid'}`;
};

/** The ids whose key differs between `before` and `after` (new ids included). */
export function changedKeys(before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): string[] {
  return [...after].filter(([id, key]) => before.get(id) !== key).map(([id]) => id);
}

/** Splits the line from `from` to `to` into dashes of length `dash` separated by `gap`; the last may be shorter. */
export function dashPieces(from: Vec3, to: Vec3, dash: number, gap: number): [Vec3, Vec3][] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  if (length === 0 || dash <= 0) return [];
  const at = (d: number): Vec3 => {
    const t = Math.min(d, length) / length;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
  };
  const pieces: [Vec3, Vec3][] = [];
  // A small epsilon so floating error at the end doesn't add a zero-length dash.
  for (let d = 0; d < length - 1e-9; d += dash + gap) pieces.push([at(d), at(d + dash)]);
  return pieces;
}

// ---------------------------------------------------------------------------------------------------------------
// Badges

export interface BadgeModel {
  id: string;
  /** 1-based position in the loop. */
  order: number;
  /** Material Icons ligature of the state (StateDisplay.icon). */
  icon: string;
  /** The suspect badge also names the loop node. */
  name: string | null;
  suspect: boolean;
  mismatch: boolean;
  /** Marker classes from NODE_STATE_DISPLAY: filled when measured, hollow (dashed when not live) when not. */
  classes: string;
}

export function badgeModels(nodes: readonly NodeStatus[]): BadgeModel[] {
  return nodes.map((s, i) => {
    const display = NODE_STATE_DISPLAY[s.state];
    const suspect = s.state === 'suspect';
    return {
      id: s.node.id,
      order: i + 1,
      icon: display.icon,
      name: suspect ? SHORT_LABEL[s.node.id] ?? s.node.label : null,
      suspect,
      mismatch: s.mismatch,
      classes: s.node.topic ? display.marker.measured : display.marker.unmeasured
    };
  });
}

/** Badge width used until the browser has laid a badge out (and in jsdom, which lays nothing out). */
export const BADGE_FALLBACK_WIDTH = 36;

// ---------------------------------------------------------------------------------------------------------------
// Fallbacks, notices and preferences

/** Makes a throwaway WebGL context to see whether one can be made, and releases it straight away. */
export function isWebGLAvailable(doc: Pick<Document, 'createElement'>): boolean {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

export type FallbackReason = 'webgl' | 'model' | 'init' | 'context';

/** Thrown by the scene: no WebGL context, the model is present but broken (or timed out), or setup failed. */
export class CarSceneError extends Error {
  constructor(
    readonly kind: 'webgl' | 'model' | 'init',
    options?: { cause?: unknown }
  ) {
    super(
      kind === 'webgl'
        ? 'WebGL is unavailable'
        : kind === 'model'
          ? 'The car model could not be loaded'
          : 'The 3D scene failed to start',
      options
    );
    this.name = 'CarSceneError';
  }
}

export function fallbackReasonFor(error: unknown): FallbackReason {
  return error instanceof CarSceneError ? error.kind : 'init';
}

/** Shown by the page above the 2D view after the 3D view gave up. File paths go to the console only. */
export const FALLBACK_NOTICES: Record<FallbackReason, string> = {
  webgl: '3D view unavailable (no WebGL). Showing 2D.',
  model: '3D view unavailable (the car model could not be read). Showing 2D.',
  init: '3D view failed to start. Showing 2D.',
  context: '3D view lost its graphics context (sleep or GPU reset). Showing 2D; switch to 3D to retry.'
};

export const ABSENT_MODEL_NOTICE = 'No car model yet, showing the loop wiring only';

/** How to move the camera, for the pointer in hand. */
export const orbitHint = (coarse: boolean) =>
  coarse
    ? 'Two fingers to rotate and zoom. Pick a view to reset.'
    : 'Drag to orbit, scroll to zoom, right-drag to pan. Pick a view to reset.';

export const MATERIAL_MODE_KEY = 'argos.shutdown.carView.material';

export function readMaterialMode(storage: () => Pick<Storage, 'getItem'>): MaterialMode {
  try {
    const stored = storage().getItem(MATERIAL_MODE_KEY);
    return MATERIAL_MODES.some((m) => m.id === stored) ? (stored as MaterialMode) : 'see-through';
  } catch {
    return 'see-through';
  }
}

export function writeMaterialMode(storage: () => Pick<Storage, 'setItem'>, mode: MaterialMode): void {
  try {
    storage().setItem(MATERIAL_MODE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}
