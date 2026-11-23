import { Vec3 } from '../../shutdown-loop.positions-3d';

// Screen-space helpers shared by the 3D car views: camera presets and fit, picking, and placing the HTML loop
// node badges over the canvas. Pure: nothing here imports three, so it is cheap to test and to load.

export type ViewPreset = 'side' | 'top' | 'iso';

/**
 * Direction from the target to the camera per preset, in the shared frame (shutdown-loop.positions-3d.ts: +X the
 * driver's left, +Y up, +Z forward). Side looks at the driver's left, so the nose points left as in the 2D view.
 */
export const VIEW_DIRECTIONS: Readonly<Record<ViewPreset, Vec3>> = {
  side: [1, 0.05, 0],
  top: [0.001, 1, 0],
  iso: [1, 0.7, 0.8]
};

/** A loop node's marker projected onto the canvas, in CSS pixels from its top-left corner. */
export interface ProjectedPoint {
  id: string;
  x: number;
  y: number;
  /** Normalised device depth, -1 (near plane) to 1 (far plane): smaller is nearer the camera. */
  z: number;
  /** False when the point is behind the camera or off the canvas. */
  visible: boolean;
}

/**
 * Camera distance from the target at which every point is in view. Points are relative to the target, in camera
 * axes: x right, y up, z towards the camera. Fitting a box's corners rather than its bounding sphere fills a wide
 * canvas properly.
 */
export function fitDistanceToPoints(points: readonly Vec3[], verticalFovDeg: number, aspect: number, margin = 1.1): number {
  const tanV = Math.tan((verticalFovDeg * Math.PI) / 360);
  const tanH = tanV * aspect;
  let distance = 0;
  for (const [x, y, z] of points) {
    distance = Math.max(distance, z + Math.max((Math.abs(x) * margin) / tanH, (Math.abs(y) * margin) / tanV));
  }
  return distance;
}

/** Points closer than this (px) to the best distance count as a tie, which the nearer point (smaller z) wins. */
const PICK_TIE_PX = 1;

/** The id of the visible point nearest (x, y), if one is within `reach` pixels; ties go to the nearer point. */
export function nearestPoint(points: readonly ProjectedPoint[], x: number, y: number, reach: number): string | null {
  let best: ProjectedPoint | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    if (!p.visible) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d > reach) continue;
    const tie = best !== null && Math.abs(d - bestDist) <= PICK_TIE_PX;
    if ((tie && p.z < best!.z) || (!tie && d < bestDist)) {
      best = p;
      bestDist = d;
    }
  }
  return best?.id ?? null;
}

/** A loop node's projected marker, with the size of its badge. */
export interface BadgePoint extends ProjectedPoint {
  /** Suspects are placed first, and no other badge may cover a suspect's marker. */
  suspect: boolean;
  width: number;
  height: number;
}

export interface BadgePlacement {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
  /** Index of the spot taken around the marker (0 = preferred), kept while it stays clear. */
  spot: number;
  /** Draw a leader line from the marker to `leaderTo`: the badge sits more than LEADER_MIN_GAP from its marker. */
  leader: boolean;
  leaderTo: { x: number; y: number };
}

/** Gap between a marker and a badge in the first ring of spots. */
const SPOT_GAP = 6;
/** Gap kept between neighbouring badges. */
const BADGE_GAP = 2;
/** A badge whose nearest edge is further than this from its marker gets a leader line. */
export const LEADER_MIN_GAP = 8;
/** Covering a suspect's marker costs more than any overlap between badges. */
const COVERS_SUSPECT = 1e9;

type Quadrant = readonly [qx: 1 | -1, qy: 1 | -1];
const UR: Quadrant = [1, -1];
const UL: Quadrant = [-1, -1];
const DR: Quadrant = [1, 1];
const DL: Quadrant = [-1, 1];
/** Spots around a marker in order of preference: [quadrant, steps out sideways, steps out vertically]. */
const SPOTS: readonly (readonly [Quadrant, number, number])[] = [
  [UR, 0, 0],
  [UL, 0, 0],
  [DR, 0, 0],
  [DL, 0, 0],
  [UR, 0, 1],
  [UL, 0, 1],
  [UR, 1, 0],
  [UL, 1, 0],
  [DR, 1, 0],
  [DL, 1, 0],
  [DR, 0, 1],
  [DL, 0, 1],
  [UR, 1, 1],
  [UL, 1, 1],
  [DR, 1, 1],
  [DL, 1, 1]
];

function spotRect(p: BadgePoint, spot: number): { left: number; top: number } {
  const [[qx, qy], sx, sy] = SPOTS[spot];
  const left = qx > 0 ? p.x + SPOT_GAP + sx * (p.width + BADGE_GAP) : p.x - SPOT_GAP - p.width - sx * (p.width + BADGE_GAP);
  const top =
    qy < 0 ? p.y - SPOT_GAP - p.height - sy * (p.height + BADGE_GAP) : p.y + SPOT_GAP + sy * (p.height + BADGE_GAP);
  return { left: Math.round(left), top: Math.round(top) };
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) + BADGE_GAP - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top + a.height, b.top + b.height) + BADGE_GAP - Math.max(a.top, b.top));

const contains = (r: Rect, x: number, y: number) =>
  x >= r.left - BADGE_GAP &&
  x <= r.left + r.width + BADGE_GAP &&
  y >= r.top - BADGE_GAP &&
  y <= r.top + r.height + BADGE_GAP;

/**
 * Places each loop node's badge next to its projected marker. Suspects go first, so the culprit gets its
 * preferred spot; then the rest in loop order. Each badge takes the first spot around its marker that covers no
 * badge placed before it and no suspect's marker; in a crowd, the least covered one. A badge keeps the spot it had
 * in `previous` while that spot stays clear, so badges don't hop while the camera moves. Results are in input order.
 */
export function placeBadges(
  points: readonly BadgePoint[],
  previous: ReadonlyMap<string, BadgePlacement> = new Map()
): BadgePlacement[] {
  const suspects = points.filter((p) => p.suspect && p.visible);
  const taken: Rect[] = [];
  const cost = (p: BadgePoint, r: Rect) => {
    let sum = 0;
    for (const t of taken) sum += overlapArea(r, t);
    for (const s of suspects) if (s.id !== p.id && contains(r, s.x, s.y)) sum += COVERS_SUSPECT;
    return sum;
  };
  const place = (p: BadgePoint): BadgePlacement => {
    const at = (spot: number) => ({ ...spotRect(p, spot), width: p.width, height: p.height, spot });
    if (!p.visible) return finish(p, at(0), false);
    const before = previous.get(p.id);
    let chosen = before?.visible ? at(before.spot) : undefined;
    if (!chosen || cost(p, chosen) > 0) {
      let best = Infinity;
      for (let spot = 0; spot < SPOTS.length; spot++) {
        const r = at(spot);
        const c = cost(p, r);
        if (c < best) {
          best = c;
          chosen = r;
        }
        if (c === 0) break;
      }
    }
    taken.push(chosen!);
    return finish(p, chosen!, true);
  };
  const order = [...points.filter((p) => p.suspect), ...points.filter((p) => !p.suspect)];
  const byId = new Map(order.map((p) => [p.id, place(p)]));
  return points.map((p) => byId.get(p.id)!);
}

function finish(p: BadgePoint, r: Rect & { spot: number }, visible: boolean): BadgePlacement {
  const leaderTo = {
    x: Math.min(Math.max(p.x, r.left), r.left + r.width),
    y: Math.min(Math.max(p.y, r.top), r.top + r.height)
  };
  const gap = Math.max(Math.abs(leaderTo.x - p.x), Math.abs(leaderTo.y - p.y));
  return { id: p.id, ...r, visible, leader: visible && gap > LEADER_MIN_GAP, leaderTo };
}
