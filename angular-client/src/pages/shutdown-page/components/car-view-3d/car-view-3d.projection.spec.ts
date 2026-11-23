import { PerspectiveCamera, Vector3 } from 'three';
import { NODE_POSITIONS_3D, Vec3 } from '../../shutdown-loop.positions-3d';
import {
  BADGE_SIZE,
  BadgePlacement,
  BadgePoint,
  fitDistanceToPoints,
  HALO_RADIUS_PX,
  nearestPoint,
  placeBadges,
  ScreenPoint,
  VIEW_FOV_DEG,
  viewPose,
  ViewPreset
} from './car-view-3d.projection';

/** The box every 3D car fits in (see shutdown-loop.positions-3d.spec.ts), and the canvas the checks use. */
const ENVELOPE_MIN: Vec3 = [-0.75, 0, -0.5];
const ENVELOPE_MAX: Vec3 = [0.75, 1.3, 2.6];
const W = 1000;
const H = 560;
const PRESETS: ViewPreset[] = ['iso', 'side', 'top'];

/** Every loop node's marker on a W x H canvas, through a real three.js camera posed by viewPose. */
function project(preset: ViewPreset, w = W, h = H): ScreenPoint[] {
  const pose = viewPose(ENVELOPE_MIN, ENVELOPE_MAX, preset, w / h);
  const camera = new PerspectiveCamera(VIEW_FOV_DEG, w / h, pose.distance / 100, pose.distance * 10);
  camera.position.set(...pose.position);
  camera.lookAt(new Vector3(...pose.target));
  camera.updateMatrixWorld();
  return Object.entries(NODE_POSITIONS_3D).map(([id, p]) => {
    const v = new Vector3(...p).project(camera);
    const x = ((v.x + 1) / 2) * w;
    const y = ((1 - v.y) / 2) * h;
    return { id, x, y, z: v.z, visible: v.z > -1 && v.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
  });
}

const point = (id: string, x: number, y: number, extra: Partial<BadgePoint> = {}): BadgePoint => ({
  id,
  x,
  y,
  z: 0,
  visible: true,
  ...extra
});

const overlaps = (a: BadgePlacement, b: BadgePlacement) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + BADGE_SIZE && b.top < a.top + BADGE_SIZE;

const distanceTo = (r: BadgePlacement, x: number, y: number) =>
  Math.hypot(Math.max(r.left - x, 0, x - (r.left + r.width)), Math.max(r.top - y, 0, y - (r.top + BADGE_SIZE)));

describe('fitDistanceToPoints', () => {
  it('backs off until the widest point fits the narrower of the two fields of view', () => {
    const tan20 = Math.tan((20 * Math.PI) / 180);
    expect(fitDistanceToPoints([[0, 1, 0]], 40, 1, 1)).toBeCloseTo(1 / tan20);
    expect(fitDistanceToPoints([[2, 0, 0]], 40, 2, 1)).toBeCloseTo(2 / (tan20 * 2));
    // A point nearer the camera needs that much more distance.
    expect(fitDistanceToPoints([[0, 1, 0.5]], 40, 1, 1)).toBeCloseTo(0.5 + 1 / tan20);
  });
});

describe('viewPose', () => {
  it('aims at the centre of the box from the preset direction', () => {
    const pose = viewPose(ENVELOPE_MIN, ENVELOPE_MAX, 'side', 1.6);
    expect(pose.target).toEqual([0, 0.65, 1.05]);
    expect(pose.position[0]).toBeGreaterThan(pose.distance * 0.99);
  });

  it('shows the nose to the left in Side and Top, as in the 2D view', () => {
    for (const preset of ['side', 'top'] as const) {
      const byId = new Map(project(preset).map((p) => [p.id, p]));
      expect(byId.get('bots')!.x, preset).toBeLessThan(byId.get('airs')!.x);
    }
  });

  it('keeps every marker on a 1000 x 560 canvas and on a phone-shaped one', () => {
    for (const preset of PRESETS) {
      for (const [w, h] of [
        [W, H],
        [360, 280]
      ]) {
        expect(
          project(preset, w, h)
            .filter((p) => !p.visible)
            .map((p) => p.id),
          `${preset} ${w}x${h}`
        ).toEqual([]);
      }
    }
  });
});

describe('nearestPoint', () => {
  const points: ScreenPoint[] = [
    { id: 'a', x: 10, y: 10, z: 0.5, visible: true },
    { id: 'b', x: 30, y: 10, z: 0.5, visible: true },
    { id: 'hidden', x: 50, y: 10, z: 0.5, visible: false }
  ];

  it('returns the nearest visible point within reach', () => {
    expect(nearestPoint(points, 12, 11, 16)).toBe('a');
    expect(nearestPoint(points, 27, 10, 16)).toBe('b');
  });

  it('returns null when nothing visible is within reach', () => {
    expect(nearestPoint(points, 10, 40, 16)).toBeNull();
    expect(nearestPoint(points, 50, 10, 16)).toBeNull();
  });

  it('breaks a tie (within 1 px) towards the point nearer the camera', () => {
    const tie: ScreenPoint[] = [
      { id: 'far', x: 10, y: 10, z: 0.9, visible: true },
      { id: 'near', x: 10.5, y: 10, z: 0.2, visible: true }
    ];
    expect(nearestPoint(tie, 10, 10, 16)).toBe('near');
    expect(nearestPoint([...tie].reverse(), 10, 10, 16)).toBe('near');
  });

  it('picks each marker at its own centre in every preset, AIRs/HVD and Cockpit BRB/Inertia included', () => {
    for (const preset of PRESETS) {
      const points3d = project(preset);
      const wrong = points3d.filter((p) => nearestPoint(points3d, p.x, p.y) !== p.id).map((p) => p.id);
      expect(wrong, preset).toEqual([]);
    }
  });

  it('keeps every pair of markers at least 12 px apart in every preset (latch and sense rows apart)', () => {
    for (const preset of PRESETS) {
      const pts = project(preset);
      const close: string[] = [];
      pts.forEach((a, i) =>
        pts.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 12) close.push(`${a.id}/${b.id} ${d.toFixed(1)}px`);
        })
      );
      expect(close, preset).toEqual([]);
    }
  });
});

describe('placeBadges', () => {
  it('places suspects first, so a suspect in a cluster gets its preferred spot', () => {
    const [a, culprit] = placeBadges([point('a', 100, 100), point('culprit', 104, 100, { suspect: true })]);
    expect(culprit.spot).toBe(0);
    expect(a.spot).not.toBe(0);
    expect(overlaps(a, culprit)).toBe(false);
  });

  it('never covers a suspect’s halo, its own badge included', () => {
    const cluster = [
      point('a', 200, 200),
      point('b', 204, 200),
      point('s1', 208, 200, { suspect: true }),
      point('c', 212, 202),
      point('s2', 216, 198, { suspect: true, width: 70 }),
      point('d', 220, 200, { width: 60 })
    ];
    const placed = placeBadges(cluster);
    for (const badge of placed) {
      for (const s of cluster.filter((p) => p.suspect)) {
        expect(distanceTo(badge, s.x, s.y), `${badge.id} over ${s.id}`).toBeGreaterThanOrEqual(HALO_RADIUS_PX);
      }
    }
  });

  it('fans a 5-node cluster spaced 4 px apart out without overlap', () => {
    const placed = placeBadges([0, 1, 2, 3, 4].map((i) => point(`n${i}`, 300 + i * 4, 300)));
    placed.forEach((a, i) => placed.slice(i + 1).forEach((b) => expect(overlaps(a, b), `${a.id}/${b.id}`).toBe(false)));
  });

  it('keeps badges a constant size whatever the zoom', () => {
    const near = placeBadges([point('a', 10, 10), point('b', 500, 10, { width: 64 })]);
    expect(near.map((b) => b.width)).toEqual([BADGE_SIZE, 64]);
  });

  it('keeps a badge’s previous spot while it is still clear, so badges don’t hop as the camera moves', () => {
    const first = placeBadges([point('a', 100, 100), point('b', 104, 100)]);
    const nudged = placeBadges([point('a', 103, 101), point('b', 107, 101)], first);
    expect(nudged.map((b) => b.spot)).toEqual(first.map((b) => b.spot));
  });

  it('draws a leader only for a badge pushed out of the first ring', () => {
    const placed = placeBadges([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => point(`n${i}`, 300, 300 + i)));
    expect(placed[0].leader).toBe(false);
    expect(placed.some((b) => b.leader)).toBe(true);
  });

  it('returns placements in input order and leaves hidden points unplaced', () => {
    const placed = placeBadges([
      point('a', 0, 0),
      point('s', 50, 50, { suspect: true }),
      point('h', 9, 9, { visible: false })
    ]);
    expect(placed.map((b) => b.id)).toEqual(['a', 's', 'h']);
    expect(placed[2].visible).toBe(false);
  });
});
