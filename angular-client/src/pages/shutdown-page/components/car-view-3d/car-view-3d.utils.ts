import {
  loopOf,
  NODE_STATE_DISPLAY,
  nodeAriaLabel,
  readStateColours,
  segmentState,
  SHORT_LABEL,
  WIRE_WIDTH,
  WireEmphasis
} from '../../shutdown-loop.display';
import { Vec3 } from '../../shutdown-loop.positions-3d';
import { CssVarReader, readThemeColour, ThemeColourToken } from '../../shutdown-loop.theme';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { SceneColours } from './car-scene.types';

// The 3D car view's pure parts: what to draw for the loop, the badges, colours, frame scheduling and fallbacks.
// No three.js here, so the page's first load doesn't pull it in and all of this is unit-testable in jsdom.

export type MarkerShape = 'sphere' | 'octahedron' | 'cone' | 'box';
/** One shape per state, so markers read apart without colour: ok ball, sharp octahedron, down cone, unknown box. */
export const MARKER_SHAPE: Record<NodeState, MarkerShape> = {
  closed: 'sphere',
  suspect: 'octahedron',
  'downstream-open': 'cone',
  'no-data': 'box'
};

/** Metres of 3D wire diameter per px of 2D wire width, so the closed wire is a 1 cm tube. */
const WIRE_METRES_PER_PX = 0.0067;
/**
 * Loop wire tube radius (metres) per emphasis, in proportion to the 2D wire's core width (WIRE_WIDTH), so 3D and
 * 2D weigh the cause, closed and dead wires the same way. The 2D casing has no 3D counterpart: a tube has depth.
 */
export const WIRE_RADIUS = Object.fromEntries(
  (Object.keys(WIRE_WIDTH) as WireEmphasis[]).map((e) => [e, (WIRE_WIDTH[e].core * WIRE_METRES_PER_PX) / 2])
) as Record<WireEmphasis, number>;

/** Metres per SVG user unit when a StateDisplay dash pattern (in px) becomes 3D dashes. */
const DASH_SCALE = 0.007;

export interface LoopSegment3d {
  key: string;
  from: Vec3;
  to: Vec3;
  state: NodeState;
  emphasis: WireEmphasis;
  /** [dash, gap] in metres, or null for a solid wire. */
  dash: readonly [number, number] | null;
}

export interface Marker3d {
  id: string;
  order: number;
  position: Vec3;
  state: NodeState;
  shape: MarkerShape;
  /** Unmeasured (no sensor): drawn as a wireframe. */
  hollow: boolean;
}

type Positions = Readonly<Record<string, Vec3>>;

/** A StateDisplay dash ("7 6") as 3D [dash, gap] metres. */
function dashFor(state: NodeState): readonly [number, number] | null {
  const pattern = NODE_STATE_DISPLAY[state].dash;
  if (!pattern) return null;
  const [dash, gap = dash] = pattern.split(/[\s,]+/).map(Number);
  return [dash * DASH_SCALE, gap * DASH_SCALE];
}

/**
 * The loop wire, loop node to loop node in series order. Wire i takes segmentState(nodes, i), the rule the strip
 * and the 2D car use, so the views never drift: the cause stretch is strong, the wire after the break is dashed
 * downstream, no data is dotted. Wires with an unplaced end are skipped.
 */
export function buildLoopSegments(nodes: readonly NodeStatus[], positions: Positions): LoopSegment3d[] {
  const segments: LoopSegment3d[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i].node.id;
    const b = nodes[i + 1].node.id;
    const from = positions[a];
    const to = positions[b];
    if (!from || !to) continue;
    const state = segmentState(nodes, i);
    segments.push({ key: `${a}-${b}`, from, to, state, emphasis: NODE_STATE_DISPLAY[state].emphasis, dash: dashFor(state) });
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
      shape: MARKER_SHAPE[s.state],
      hollow: !s.node.topic
    });
  });
  return markers;
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

/** What the scene draws depends only on each loop node's state and mismatch flag, not on ages or values ticking. */
export function sceneSignature(nodes: readonly NodeStatus[]): string {
  return nodes.map((s) => `${s.node.id}:${s.state}:${s.mismatch ? 1 : 0}`).join('|');
}

export interface BadgeModel {
  id: string;
  order: number;
  /** "12", or "12 TSMS" for a suspect or the highlighted loop node. */
  text: string;
  /** The state's glyph (StateDisplay.icon). */
  icon: string;
  /** The marker look shared with the strip and 2D car (filled measured, hollow unmeasured). */
  classes: string;
  suspect: boolean;
  highlighted: boolean;
  mismatch: boolean;
  /** The shared accessible name, as a tooltip (the badges themselves are aria-hidden). */
  title: string;
  /** Estimated width in px, for placeBadges. */
  width: number;
}

/** One HTML badge per loop node, over the canvas. */
export function badgeModels(nodes: readonly NodeStatus[], highlightId: string | null): BadgeModel[] {
  const loop = loopOf(nodes);
  return nodes.map((s, i) => {
    const d = NODE_STATE_DISPLAY[s.state];
    const suspect = s.state === 'suspect';
    const highlighted = s.node.id === highlightId;
    const order = i + 1;
    const text = suspect || highlighted ? `${order} ${SHORT_LABEL[s.node.id] ?? s.node.label}` : String(order);
    return {
      id: s.node.id,
      order,
      text,
      icon: d.icon,
      classes: s.node.topic ? d.marker.measured : d.marker.unmeasured,
      suspect,
      highlighted,
      mismatch: s.mismatch,
      title: nodeAriaLabel(s, loop),
      // Padding and border 10, the glyph 14 + 2, about 7 px per character of 12 px bold text, the mismatch pip.
      width: Math.ceil(26 + text.length * 7 + (s.mismatch ? 14 : 0))
    };
  });
}

/** Theme token per scene colour (src/styles/theme.css): neutrals only, so nothing in the car reads as a state. */
export const SCENE_COLOR_TOKENS: Record<Exclude<keyof SceneColours, 'states'>, ThemeColourToken> = {
  frame: '--color-border-strong',
  body: '--color-surface-3',
  tyre: '--color-page',
  rim: '--color-indicator-off',
  hv: '--color-secondary-border',
  edge: '--color-fg-dim',
  grid: '--color-border'
};

/** Every scene colour from its theme token; the state colours are the same tokens the 2D views use. */
export function readSceneColours(read: CssVarReader): SceneColours {
  const neutrals = Object.fromEntries(
    Object.entries(SCENE_COLOR_TOKENS).map(([key, token]) => [key, readThemeColour(token, read)])
  ) as Omit<SceneColours, 'states'>;
  return { ...neutrals, states: readStateColours(read) };
}

/** True if this browser can create a WebGL context (WebGL 2 preferred). The probe context is released at once. */
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

/**
 * Frames on demand: `request()` schedules at most one frame, and the frame runs `step`, which renders and says
 * whether something is still moving (a camera tween, orbit damping). Nothing else keeps it running, so an idle
 * scene renders no frames, whatever the loop's state.
 */
export class RenderLoop {
  /** Frames rendered so far. */
  frames = 0;
  private handle = 0;
  private disposed = false;

  constructor(
    private readonly step: (now: number) => boolean,
    private readonly raf: (cb: FrameRequestCallback) => number = (cb) => requestAnimationFrame(cb),
    private readonly caf: (handle: number) => void = (h) => cancelAnimationFrame(h)
  ) {}

  request(): void {
    if (this.handle || this.disposed) return;
    this.handle = this.raf((now) => {
      this.handle = 0;
      if (this.disposed) return;
      this.frames++;
      if (this.step(now)) this.request();
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.handle) this.caf(this.handle);
    this.handle = 0;
  }
}

export type FallbackReason = 'webgl' | 'init' | 'context-lost';

/** Thrown by the scene when no WebGL context could be made. */
export class CarSceneError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('WebGL is unavailable', options);
    this.name = 'CarSceneError';
  }
}

export const fallbackReasonFor = (error: unknown): FallbackReason => (error instanceof CarSceneError ? 'webgl' : 'init');

export const FALLBACK_NOTICES: Record<FallbackReason, string> = {
  webgl: '3D view unavailable (no WebGL). Showing 2D.',
  init: 'The 3D view failed to start. Showing 2D.',
  'context-lost': 'The 3D view lost its graphics context (sleep or GPU reset). Showing 2D.'
};
