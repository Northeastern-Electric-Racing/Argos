import { Vec3 } from '../../shutdown-loop.positions-3d';

// Screen-space helpers shared by every 3D car view: camera framing, picking and badge placement. Pure maths with
// no three.js, so they are cheap to test and to load. Coordinates are in the shared frame of
// shutdown-loop.positions-3d.ts (metres, +Y up, +Z forward, +X to the driver's left).

export type ViewPreset = 'side' | 'top' | 'iso';

/** Vertical field of view of the 3D car camera, in degrees. */
export const VIEW_FOV_DEG = 40;

/**
 * Direction from the target to the camera per preset. Side looks at the car's left, so the nose points left as in
 * the 2D view; Top looks down with the nose to the left; Iso is from the front left, above.
 */
export const VIEW_DIRECTIONS: Record<ViewPreset, Vec3> = {
  side: [1, 0.05, 0],
  top: [0.001, 1, 0],
  iso: [1, 0.7, 0.8]
};

/** A loop node's marker projected onto the canvas, in CSS pixels from its top-left corner. */
export interface ScreenPoint {
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
 * axes: x right, y up, z towards the camera. Fitting the box's corners rather than its bounding sphere fills a
 * wide canvas properly.
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

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export interface ViewPose {
  /** Orbit target: the centre of the box. */
  target: Vec3;
  /** Camera position. */
  position: Vec3;
  /** Camera distance from the target. */
  distance: number;
}

/**
 * Where the camera goes so that the box from `min` to `max` fills the view from `preset`'s direction, aimed at the
 * box's centre. With `points` (e.g. the car's vertices) it fits those instead of the box's corners, which frames
 * the car more tightly from oblique directions.
 */
export function viewPose(
  min: Vec3,
  max: Vec3,
  preset: ViewPreset,
  aspect: number,
  verticalFovDeg = VIEW_FOV_DEG,
  margin = 1.1,
  points?: readonly Vec3[]
): ViewPose {
  const target: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  // Camera axes for this direction: z towards the camera, x right, y up.
  const z = unit(VIEW_DIRECTIONS[preset]);
  const x = unit(cross([0, 1, 0], z));
  const y = cross(z, x);
  const fit: Vec3[] = [];
  if (points?.length) fit.push(...points);
  else
    for (const cx of [min[0], max[0]])
      for (const cy of [min[1], max[1]]) for (const cz of [min[2], max[2]]) fit.push([cx, cy, cz]);
  const inCamera = fit.map((p): Vec3 => {
    const rel = sub(p, target);
    return [dot(rel, x), dot(rel, y), dot(rel, z)];
  });
  const distance = fitDistanceToPoints(inCamera, verticalFovDeg, aspect, margin);
  const position: Vec3 = [target[0] + z[0] * distance, target[1] + z[1] * distance, target[2] + z[2] * distance];
  return { target, position, distance };
}

/** How far (CSS px) from a marker a click or hover still reaches it. */
export const PICK_REACH_PX = 16;
/** Points this close in distance (px) count as a tie, which the one nearer the camera wins. */
const PICK_TIE_PX = 1;

/** The id of the visible point nearest (x, y) within `reach` pixels; on a tie (±1 px), the one nearer the camera. */
export function nearestPoint(points: readonly ScreenPoint[], x: number, y: number, reach = PICK_REACH_PX): string | null {
  let best: ScreenPoint | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    if (!p.visible) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d > reach) continue;
    const tie = Math.abs(d - bestDist) <= PICK_TIE_PX;
    if (!best || (tie ? p.z < best.z : d < bestDist)) {
      best = p;
      bestDist = d;
    }
  }
  return best?.id ?? null;
}

/** Badges are this many CSS pixels tall (the AA minimum target), and at least this wide. */
export const BADGE_SIZE = 24;
const BADGE_GAP = 2;
/** A badge whose nearest edge is further than this (px) beyond the first ring of spots gets a leader line. */
export const LEADER_MIN_PX = 8;

/** A point to label: a ScreenPoint plus whether it is a suspect (placed first) and the badge's width. */
export interface BadgePoint extends ScreenPoint {
  suspect?: boolean;
  /** Badge width in px; BADGE_SIZE when omitted. */
  width?: number;
  /** A suspect shown without a badge: nothing is placed for it, but badges keep off its halo. */
  unlabelled?: boolean;
}

export interface BadgePlacement {
  id: string;
  left: number;
  top: number;
  width: number;
  visible: boolean;
  /** Index into the candidate spots, for hysteresis (pass the result back as `previous`). */
  spot: number;
  /** The badge sits away from its marker: draw a line from (x, y) to the badge. */
  leader: boolean;
  x: number;
  y: number;
}

/** A suspect's halo ring has this radius (px); no badge may cover any of it. */
export const HALO_RADIUS_PX = 16;

/**
 * Candidate spots, in order of preference: a direction from the marker (up-right first, then the other corners,
 * then straight up, down, right, left) and how far the badge's nearest corner or edge sits from it.
 */
const SPOTS: readonly { sx: -1 | 0 | 1; sy: -1 | 0 | 1; gap: number }[] = [12, 32, 54].flatMap((gap) =>
  (
    [
      [1, -1],
      [-1, -1],
      [1, 1],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0]
    ] as const
  ).map(([sx, sy]) => ({ sx, sy, gap: sx && sy ? gap : Math.round(gap * 1.35) }))
);

type Rect = { left: number; top: number; width: number };

const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.left + a.width, b.left + b.width) + BADGE_GAP - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.top, b.top) + BADGE_SIZE + BADGE_GAP - Math.max(a.top, b.top));

/** Whether the rectangle reaches within `radius` of (x, y). */
const reaches = (r: Rect, x: number, y: number, radius: number) => {
  const dx = Math.max(r.left - x, 0, x - (r.left + r.width));
  const dy = Math.max(r.top - y, 0, y - (r.top + BADGE_SIZE));
  return Math.hypot(dx, dy) < radius;
};

/** Cost of covering a suspect's halo: more than any overlap between badges, or leaving the canvas, can add up to. */
const COVER_SUSPECT = 1e9;
/** Cost per px² of badge outside the canvas: worse than any overlap between badges. */
const OUTSIDE = 1e4;

/** The canvas size, so badges stay on it. */
export interface BadgeBounds {
  width: number;
  height: number;
}

/** Area (px²) of the rectangle outside the canvas. */
const outsideArea = (r: Rect, b: BadgeBounds | undefined) => {
  if (!b) return 0;
  const w = Math.max(0, Math.min(r.left + r.width, b.width) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.top + BADGE_SIZE, b.height) - Math.max(r.top, 0));
  return r.width * BADGE_SIZE - w * h;
};

/**
 * Places a fixed-size badge beside each point. Suspects go first (in loop order) so the culprit gets its preferred
 * spot and the top of the stack; then the rest in loop order. Each badge takes the first spot that overlaps no
 * badge already placed, covers no suspect's halo (its own included) and stays inside `bounds`; in a crowd, the
 * least bad one. Unlabelled points get no badge and are left out of the result. A badge keeps its
 * `previous` spot while that is still clear, so badges don't hop as the camera moves. Results are in input order.
 */
export function placeBadges(
  points: readonly BadgePoint[],
  previous?: readonly BadgePlacement[],
  bounds?: BadgeBounds
): BadgePlacement[] {
  const before = new Map(previous?.map((p) => [p.id, p.spot]));
  const suspects = points.filter((p) => p.visible && p.suspect);
  const labelled = points.filter((p) => !p.unlabelled);
  const order = [...labelled.filter((p) => p.suspect), ...labelled.filter((p) => !p.suspect)];
  const taken: Rect[] = [];
  const placed = new Map<string, BadgePlacement>();

  for (const p of order) {
    const width = Math.max(BADGE_SIZE, p.width ?? BADGE_SIZE);
    const rectAt = (i: number): Rect => {
      const { sx, sy, gap } = SPOTS[i];
      const left = sx > 0 ? p.x + gap : sx < 0 ? p.x - gap - width : p.x - width / 2;
      const top = sy > 0 ? p.y + gap : sy < 0 ? p.y - gap - BADGE_SIZE : p.y - BADGE_SIZE / 2;
      return { left: Math.round(left), top: Math.round(top), width };
    };
    const cost = (i: number) => {
      const r = rectAt(i);
      const covered = suspects.filter((s) => reaches(r, s.x, s.y, HALO_RADIUS_PX)).length;
      const outside = outsideArea(r, bounds) * OUTSIDE;
      return covered * COVER_SUSPECT + outside + taken.reduce((sum, t) => sum + overlapArea(r, t), 0);
    };
    let spot = 0;
    if (p.visible) {
      const prev = before.get(p.id);
      if (prev !== undefined && prev < SPOTS.length && cost(prev) === 0) spot = prev;
      else {
        let best = Infinity;
        for (let i = 0; i < SPOTS.length; i++) {
          const c = cost(i);
          if (c < best) {
            best = c;
            spot = i;
          }
          if (c === 0) break;
        }
      }
      taken.push(rectAt(spot));
    }
    const r = rectAt(spot);
    placed.set(p.id, {
      id: p.id,
      ...r,
      visible: p.visible,
      spot,
      leader: p.visible && !reaches(r, p.x, p.y, LEADER_MIN_PX + 12),
      x: Math.round(p.x),
      y: Math.round(p.y)
    });
  }
  return labelled.map((p) => placed.get(p.id)!);
}
