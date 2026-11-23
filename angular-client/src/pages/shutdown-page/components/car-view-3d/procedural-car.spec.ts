import { Box3, Vector3 } from 'three';
import { NODE_POSITIONS_3D } from '../../shutdown-loop.positions-3d';
import { SceneColours } from './car-scene.types';
import { buildCar } from './procedural-car';

const GREY = '#808080';
const COLOURS: SceneColours = {
  frame: GREY,
  body: GREY,
  tyre: GREY,
  rim: GREY,
  hv: GREY,
  edge: GREY,
  grid: GREY,
  states: { closed: GREY, suspect: GREY, 'downstream-open': GREY, 'no-data': GREY }
};

describe('buildCar', () => {
  const car = buildCar(COLOURS);
  const bounds = new Box3().setFromObject(car.group);
  afterAll(() => car.dispose());

  it('sits in the shared frame: nose towards +Z, centred on X, on the ground, rear axle at the origin', () => {
    expect(bounds.max.z).toBeGreaterThan(2.3);
    expect(bounds.min.z).toBeLessThan(-0.15);
    expect(bounds.min.z).toBeGreaterThan(-0.5);
    expect(bounds.min.x).toBeCloseTo(-bounds.max.x, 2);
    expect(bounds.min.y).toBeCloseTo(0, 2);
    const nose = car.group.getObjectByName('car-build-frame')!.localToWorld(new Vector3(-0.36, 0.15, 0));
    expect(nose.z).toBeCloseTo(2.51, 2);
  });

  it('contains every loop node', () => {
    const outside = Object.entries(NODE_POSITIONS_3D)
      .filter(([, p]) => !bounds.containsPoint(new Vector3(...p)))
      .map(([id]) => id);
    expect(outside).toEqual([]);
  });

  it('puts the accumulator around the sense points', () => {
    const acc = new Box3().setFromObject(car.group.getObjectByName('accumulator')!);
    for (const id of ['acc-sense', 'tsip-sense', 'ts-minus', 'ts-plus', 'airs']) {
      expect(acc.containsPoint(new Vector3(...NODE_POSITIONS_3D[id])), id).toBe(true);
    }
  });
});
