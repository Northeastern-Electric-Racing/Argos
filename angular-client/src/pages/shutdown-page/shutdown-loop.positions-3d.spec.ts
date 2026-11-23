import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { CAR_EXTENT_3D, CarPoint3d, NODE_POSITIONS_3D } from './shutdown-loop.positions-3d';

describe('NODE_POSITIONS_3D', () => {
  it('has a position for every loop node', () => {
    const missing = SHUTDOWN_LOOP.filter((n) => !NODE_POSITIONS_3D[n.id]).map((n) => n.id);
    expect(missing).toEqual([]);
  });

  it('has no positions for nodes that are not in the loop', () => {
    const ids = new Set(SHUTDOWN_LOOP.map((n) => n.id));
    expect(Object.keys(NODE_POSITIONS_3D).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('places every node on the car', () => {
    for (const [id, p] of Object.entries(NODE_POSITIONS_3D)) {
      for (const axis of ['x', 'y', 'z'] as const) {
        const [min, max] = CAR_EXTENT_3D[axis];
        expect(p[axis], `${id}.${axis}`).toBeGreaterThanOrEqual(min);
        expect(p[axis], `${id}.${axis}`).toBeLessThanOrEqual(max);
      }
    }
  });

  it('puts the right side BRB on the right and the left one on the left', () => {
    expect(NODE_POSITIONS_3D['side-brb-r'].z).toBeLessThan(0);
    expect(NODE_POSITIONS_3D['side-brb-l'].z).toBeGreaterThan(0);
  });

  it('puts BOTS at the pedal box ahead of the cockpit and the AIRs behind the main hoop', () => {
    expect(NODE_POSITIONS_3D['bots'].x).toBeLessThan(NODE_POSITIONS_3D['cockpit-brb'].x);
    expect(NODE_POSITIONS_3D['airs'].x).toBeGreaterThan(NODE_POSITIONS_3D['side-brb-l'].x);
  });

  it('gives no two nodes the same spot', () => {
    const keys = Object.values(NODE_POSITIONS_3D).map((p: CarPoint3d) => `${p.x},${p.y},${p.z}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
