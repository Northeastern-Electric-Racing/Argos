import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { NODE_POSITIONS_3D } from './shutdown-loop.positions-3d';

describe('NODE_POSITIONS_3D', () => {
  it('has a position for every loop node', () => {
    const missing = SHUTDOWN_LOOP.filter((n) => !NODE_POSITIONS_3D[n.id]).map((n) => n.id);
    expect(missing).toEqual([]);
  });

  it('has no positions for ids that are not in the loop', () => {
    const ids = new Set(SHUTDOWN_LOOP.map((n) => n.id));
    expect(Object.keys(NODE_POSITIONS_3D).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('gives no two loop nodes the same spot', () => {
    const keys = Object.values(NODE_POSITIONS_3D).map((p) => p.join(','));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('places every loop node on the car: x in [-0.75, 0.75], y in [0, 1.3], z in [-0.5, 2.6] metres', () => {
    for (const [id, [x, y, z]] of Object.entries(NODE_POSITIONS_3D)) {
      expect([x, y, z].every(Number.isFinite), id).toBe(true);
      expect(Math.abs(x), id).toBeLessThanOrEqual(0.75);
      expect(y, id).toBeGreaterThanOrEqual(0);
      expect(y, id).toBeLessThanOrEqual(1.3);
      expect(z, id).toBeGreaterThanOrEqual(-0.5);
      expect(z, id).toBeLessThanOrEqual(2.6);
    }
  });

  it('puts the left side BRB on the driver’s left (+X) and the right one on the right', () => {
    expect(NODE_POSITIONS_3D['side-brb-l'][0]).toBeGreaterThan(0);
    expect(NODE_POSITIONS_3D['side-brb-r'][0]).toBeLessThan(0);
  });

  it('puts BOTS (pedal box) ahead of the cockpit and the AIRs (accumulator) behind it', () => {
    expect(NODE_POSITIONS_3D['bots'][2]).toBeGreaterThan(NODE_POSITIONS_3D['cockpit-brb'][2]);
    expect(NODE_POSITIONS_3D['airs'][2]).toBeLessThan(NODE_POSITIONS_3D['cockpit-brb'][2]);
  });
});
