import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { NODE_POSITIONS_3D } from './shutdown-loop.positions-3d';

describe('NODE_POSITIONS_3D', () => {
  it('has a position for every node in the loop', () => {
    const missing = SHUTDOWN_LOOP.filter((n) => !NODE_POSITIONS_3D[n.id]).map((n) => n.id);
    expect(missing).toEqual([]);
  });

  it('has no entries for ids that are not in the loop', () => {
    const ids = new Set(SHUTDOWN_LOOP.map((n) => n.id));
    expect(Object.keys(NODE_POSITIONS_3D).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('places every node on the car, in metres around the rear axle', () => {
    for (const [id, [x, y, z]] of Object.entries(NODE_POSITIONS_3D)) {
      expect([x, y, z].every(Number.isFinite), id).toBe(true);
      expect(x, id).toBeGreaterThan(-0.5);
      expect(x, id).toBeLessThan(3);
      expect(y, id).toBeGreaterThanOrEqual(0);
      expect(y, id).toBeLessThan(1.5);
      expect(Math.abs(z), id).toBeLessThan(1);
    }
  });

  it('puts the right side BRB on the driver’s right (+Z) and the left one on the left', () => {
    expect(NODE_POSITIONS_3D['side-brb-r'][2]).toBeGreaterThan(0);
    expect(NODE_POSITIONS_3D['side-brb-l'][2]).toBeLessThan(0);
  });

  it('puts BOTS (pedal box) ahead of the AIRs (accumulator)', () => {
    expect(NODE_POSITIONS_3D['bots'][0]).toBeGreaterThan(NODE_POSITIONS_3D['airs'][0]);
  });
});
