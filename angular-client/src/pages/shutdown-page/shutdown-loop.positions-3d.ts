/**
 * Where each shutdown loop node sits on the 3D car, keyed by `LoopNode.id`. One table and one frame for every 3D
 * car view (procedural or glTF), so either can take the other's markers as they are.
 *
 * | Frame  | Meaning                                                                       |
 * | ------ | ----------------------------------------------------------------------------- |
 * | units  | metres                                                                        |
 * | +Y     | up                                                                            |
 * | +Z     | forward, towards the nose (glTF's native forward: a Blender model exports as is) |
 * | +X     | to the driver's left                                                          |
 * | origin | on the ground, directly under the centre of the rear axle                    |
 *
 * Rough schematic placements read off the 2D side view, not CAD. The latch row (E-box) and the sense row
 * (accumulator) are kept apart sideways so that every pair of markers is at least 12 px apart in each camera
 * preset (see car-view-3d.projection.spec.ts). A model node named `shutdown:<node id>` (NODE_ANCHOR_PREFIX)
 * may override an entry where the car comes from a model.
 */
export type Vec3 = readonly [x: number, y: number, z: number];

/** A model node named `shutdown:<node id>` (e.g. `shutdown:tsms`) marks where that loop node sits. */
export const NODE_ANCHOR_PREFIX = 'shutdown:';

export const NODE_POSITIONS_3D: Readonly<Record<string, Vec3>> = {
  // Main hoop, behind the driver.
  glvms: [-0.2, 0.75, 0.57],
  'side-brb-r': [-0.33, 0.92, 0.68],
  'side-brb-l': [0.33, 0.92, 0.68],
  // E-box behind the main hoop, left of the centreline.
  'bms-latch': [0.1, 0.55, 0.78],
  'imd-latch': [0.1, 0.55, 0.67],
  'bspd-latch': [0.1, 0.55, 0.56],
  'can-latch': [0.1, 0.55, 0.45],
  // Motor controller at the rear.
  'mc-hvil': [0.12, 0.3, 0.1],
  // Pedal box, then the dash.
  bots: [0, 0.22, 2.03],
  inertia: [0.12, 0.62, 1.45],
  'cockpit-brb': [-0.1, 0.66, 1.4],
  tsms: [-0.2, 0.75, 0.69],
  // Accumulator side, near the rear. TODO(electrical lead): confirm side of the energy meter interlock.
  hvd: [0.24, 0.46, 0.36],
  'em-interlock': [-0.18, 0.52, 0.3],
  // Inside the accumulator, right of the centreline.
  'acc-sense': [-0.06, 0.25, 0.88],
  'tsip-sense': [-0.06, 0.25, 0.77],
  'ts-minus': [-0.06, 0.25, 0.66],
  'ts-plus': [-0.06, 0.25, 0.55],
  airs: [-0.06, 0.25, 0.44]
};
