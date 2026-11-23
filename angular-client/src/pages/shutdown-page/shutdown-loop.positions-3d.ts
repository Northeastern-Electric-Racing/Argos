/**
 * Where each shutdown loop node sits on the car in 3D, keyed by `LoopNode.id`. Shared by every 3D car view.
 *
 * The frame is glTF's native one, so a car modelled facing Blender's front exports with no rotation
 * (docs/spec/shutdown-loop-page/car-model.md):
 *
 * | axis   | direction                                    |
 * | ------ | -------------------------------------------- |
 * | units  | metres                                       |
 * | +X     | to the driver's left                         |
 * | +Y     | up                                           |
 * | +Z     | forward, towards the nose                    |
 * | origin | on the ground, under the centre of the rear axle |
 *
 * These are rough placements read off the 2D side view. In a car model, a node named `shutdown:<id>` (see
 * NODE_ANCHOR_PREFIX) overrides the entry here, so the CAD team can place loop nodes in CAD.
 */
export type Vec3 = readonly [x: number, y: number, z: number];

/** A model node named `shutdown:<loop node id>` (e.g. `shutdown:tsms`) marks where that loop node sits. */
export const NODE_ANCHOR_PREFIX = 'shutdown:';

export const NODE_POSITIONS_3D: Readonly<Record<string, Vec3>> = {
  // Main hoop, behind the driver.
  glvms: [-0.2, 0.75, 0.6],
  'side-brb-r': [-0.33, 0.92, 0.68],
  'side-brb-l': [0.33, 0.92, 0.68],
  // E-box (LFIU) behind the main hoop.
  'bms-latch': [0.05, 0.55, 0.72],
  'imd-latch': [0.05, 0.55, 0.65],
  'bspd-latch': [0.05, 0.55, 0.58],
  'can-latch': [0.05, 0.55, 0.51],
  // Motor controller at the rear.
  'mc-hvil': [0.12, 0.32, 0.2],
  // Pedal box, then the dash / front cockpit.
  bots: [0, 0.22, 2.03],
  inertia: [0.12, 0.62, 1.45],
  'cockpit-brb': [-0.1, 0.66, 1.4],
  tsms: [-0.2, 0.75, 0.66],
  // Accumulator side, near the rear.
  hvd: [0.22, 0.44, 0.4],
  'em-interlock': [-0.18, 0.52, 0.45], // side unconfirmed (spec silent)
  // Inside the accumulator.
  'acc-sense': [0, 0.25, 0.85],
  'tsip-sense': [0, 0.25, 0.75],
  'ts-minus': [0, 0.25, 0.65],
  'ts-plus': [0, 0.25, 0.55],
  airs: [0, 0.25, 0.45]
};
