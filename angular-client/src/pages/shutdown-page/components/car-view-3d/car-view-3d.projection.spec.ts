import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { NODE_POSITIONS_3D, Vec3 } from '../../shutdown-loop.positions-3d';
import {
  BadgePlacement,
  BadgePoint,
  fitDistanceToPoints,
  LEADER_MIN_GAP,
  nearestPoint,
  placeBadges,
  ProjectedPoint,
  VIEW_DIRECTIONS,
  ViewPreset
} from './car-view-3d.projection';

const pt = (id: string, x: number, y: number, extra: Partial<BadgePoint> = {}): BadgePoint => ({
  id,
  x,
  y,
  z: 0,
  visible: true,
  suspect: false,
  width: 24,
  height: 24,
  ...extra
});

type Rect = Pick<BadgePlacement, 'left' | 'top' | 'width' | 'height'>;
const overlaps = (a: Rect, b: Rect) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const covers = (r: Rect, x: number, y: number) =>
  x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;

/** Projects the table through a preset as the scenes do: camera fitted to the table's bounds at 1000×560. */
function projectTable(preset: ViewPreset, w = 1000, h = 560): ProjectedPoint[] {
  const bounds = new Box3();
  for (const p of Object.values(NODE_POSITIONS_3D)) bounds.expandByPoint(new Vector3(...p));
  const centre = bounds.getCenter(new Vector3());
  const camera = new PerspectiveCamera(40, w / h, 0.01, 100);
  const z = new Vector3(...VIEW_DIRECTIONS[preset]).normalize();
  const x = new Vector3().crossVectors(new Vector3(0, 1, 0), z).normalize();
  const y = new Vector3().crossVectors(z, x);
  const corners: Vec3[] = [];
  for (const cx of [bounds.min.x, bounds.max.x])
    for (const cy of [bounds.min.y, bounds.max.y])
      for (const cz of [bounds.min.z, bounds.max.z]) {
        const rel = new Vector3(cx, cy, cz).sub(centre);
        corners.push([rel.dot(x), rel.dot(y), rel.dot(z)]);
      }
  camera.position.copy(centre).addScaledVector(z, fitDistanceToPoints(corners, 40, w / h));
  camera.lookAt(centre);
  camera.updateMatrixWorld();
  return Object.entries(NODE_POSITIONS_3D).map(([id, p]) => {
    const v = new Vector3(...p).project(camera);
    return { id, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, z: v.z, visible: true };
  });
}

describe('VIEW_DIRECTIONS', () => {
  it('shows the nose on the left in the Side view, as in 2D', () => {
    const points = projectTable('side');
    const at = (id: string) => points.find((p) => p.id === id)!;
    expect(at('bots').x).toBeLessThan(at('airs').x);
  });
});

describe('fitDistanceToPoints', () => {
  it('fits the widest extent for the aspect ratio', () => {
    const tan20 = Math.tan((20 * Math.PI) / 180);
    expect(fitDistanceToPoints([[0, 1, 0]], 40, 1, 1)).toBeCloseTo(1 / tan20);
    expect(fitDistanceToPoints([[2, 0, 0]], 40, 2, 1)).toBeCloseTo(1 / tan20);
  });

  it('moves back by a point’s depth towards the camera', () => {
    const flat = fitDistanceToPoints([[0, 1, 0]], 40, 1, 1);
    expect(fitDistanceToPoints([[0, 1, 0.5]], 40, 1, 1)).toBeCloseTo(flat + 0.5);
  });
});

describe('nearestPoint', () => {
  const points: ProjectedPoint[] = [
    { id: 'a', x: 10, y: 10, z: 0.5, visible: true },
    { id: 'b', x: 30, y: 10, z: 0.5, visible: true },
    { id: 'hidden', x: 12, y: 10, z: 0, visible: false }
  ];

  it('picks the nearest visible point within reach', () => {
    expect(nearestPoint(points, 13, 10, 16)).toBe('a');
    expect(nearestPoint(points, 25, 12, 16)).toBe('b');
  });

  it('picks nothing beyond reach', () => {
    expect(nearestPoint(points, 100, 100, 16)).toBeNull();
  });

  it('breaks a tie (within 1 px) in favour of the point nearer the camera', () => {
    const near: ProjectedPoint[] = [
      { id: 'far', x: 10, y: 10, z: 0.9, visible: true },
      { id: 'near', x: 10.5, y: 10, z: 0.2, visible: true }
    ];
    expect(nearestPoint(near, 10, 10, 16)).toBe('near');
    expect(nearestPoint([...near].reverse(), 10, 10, 16)).toBe('near');
  });

  it.each(['iso', 'side', 'top'] as const)('picks every loop node at its own marker in the %s view', (preset) => {
    const projected = projectTable(preset);
    const crowded = (p: ProjectedPoint) =>
      preset === 'top' && projected.some((q) => q.id !== p.id && Math.hypot(q.x - p.x, q.y - p.y) < 12);
    for (const p of projected) if (!crowded(p)) expect(nearestPoint(projected, p.x, p.y, 16), p.id).toBe(p.id);
  });
});

describe('placeBadges', () => {
  it('puts a lone badge up and to the right of its marker, with no leader', () => {
    const [b] = placeBadges([pt('a', 100, 100)]);
    expect(b).toMatchObject({ left: 106, top: 70, spot: 0, visible: true, leader: false });
  });

  it('fans out a cluster without overlaps', () => {
    const cluster = [0, 4, 8, 12, 16].map((dx, i) => pt(`n${i}`, 200 + dx, 200));
    const placed = placeBadges(cluster);
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) expect(overlaps(placed[i], placed[j]), `${i}/${j}`).toBe(false);
  });

  it('places suspects first, so a suspect in a cluster gets the preferred spot', () => {
    const placed = placeBadges([pt('a', 100, 100), pt('b', 102, 100), pt('s', 104, 100, { suspect: true })]);
    expect(placed.find((p) => p.id === 's')!.spot).toBe(0);
    expect(placed.map((p) => p.id)).toEqual(['a', 'b', 's']);
  });

  it('never covers a suspect’s marker with another badge', () => {
    const points = [
      pt('s', 130, 100, { suspect: true, width: 64, height: 32 }),
      ...[0, 6, 12, 18, 24, 30].map((dx, i) => pt(`n${i}`, 100 + dx, 104))
    ];
    for (const b of placeBadges(points)) if (b.id !== 's') expect(covers(b, 130, 100), b.id).toBe(false);
  });

  it('keeps every badge where it was when nothing moved', () => {
    const points = [0, 5, 10, 15].map((dx, i) => pt(`n${i}`, 300 + dx, 300));
    const first = placeBadges(points);
    const again = placeBadges(points, new Map(first.map((b) => [b.id, b])));
    expect(again).toEqual(first);
  });

  it('keeps a clear badge’s spot after a small camera nudge (hysteresis)', () => {
    const points = [pt('a', 100, 100), pt('b', 118, 96), pt('c', 160, 140)];
    const first = placeBadges(points);
    const nudged = points.map((p) => ({ ...p, x: p.x + 3, y: p.y - 2 }));
    const again = placeBadges(nudged, new Map(first.map((b) => [b.id, b])));
    expect(again.map((b) => b.spot)).toEqual(first.map((b) => b.spot));
  });

  it('draws a leader once a badge is pushed out of the first ring', () => {
    const placed = placeBadges([0, 2, 4, 6, 8].map((dx, i) => pt(`n${i}`, 200 + dx, 200)));
    const far = placed.filter((b) => b.spot >= 4);
    expect(far.length).toBeGreaterThan(0);
    for (const b of far) expect(b.leader, b.id).toBe(true);
    for (const b of placed.filter((p) => p.spot < 4)) expect(b.leader).toBe(false);
    for (const b of far) {
      const p = placed.indexOf(b) * 2 + 200;
      expect(Math.max(Math.abs(b.leaderTo.x - p), Math.abs(b.leaderTo.y - 200))).toBeGreaterThan(LEADER_MIN_GAP);
    }
  });

  it('hides the badge of a marker that is off screen, without reserving space', () => {
    const placed = placeBadges([pt('off', 100, 100, { visible: false }), pt('on', 100, 100)]);
    expect(placed[0].visible).toBe(false);
    expect(placed[1]).toMatchObject({ visible: true, spot: 0 });
  });
});
