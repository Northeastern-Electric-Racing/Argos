/**
 * Where each shutdown node sits on the 3D car model, keyed by `LoopNode.id`.
 *
 * Model space, the same convention the car model is exported in (see src/assets/models/README.md):
 * - units are metres;
 * - +X points forward (towards the nose), +Y up, +Z to the driver's right;
 * - the origin is on the ground, directly under the centre of the rear axle.
 *
 * These are rough placements on the placeholder model, read off the 2D side view. A named empty in the
 * model (`shutdown:<node id>`, see NODE_ANCHOR_PREFIX) overrides the entry here, so the CAD team can
 * place nodes in CAD instead of editing this table.
 */
export type Vec3 = readonly [x: number, y: number, z: number];

/** A model node named `shutdown:<node id>` (e.g. `shutdown:tsms`) marks where that shutdown node sits. */
export const NODE_ANCHOR_PREFIX = 'shutdown:';

export const NODE_POSITIONS_3D: Readonly<Record<string, Vec3>> = {
  // Main hoop, behind the driver.
  glvms: [0.6, 0.75, 0.2],
  'side-brb-r': [0.68, 0.92, 0.33],
  'side-brb-l': [0.68, 0.92, -0.33],
  // E-box (LFIU) behind the main hoop.
  'bms-latch': [0.72, 0.55, -0.05],
  'imd-latch': [0.65, 0.55, -0.05],
  'bspd-latch': [0.58, 0.55, -0.05],
  'can-latch': [0.51, 0.55, -0.05],
  // Motor controller at the rear.
  'mc-hvil': [0.2, 0.32, -0.12],
  // Pedal box, then the dash / front cockpit.
  bots: [2.03, 0.22, 0],
  inertia: [1.45, 0.62, -0.12],
  'cockpit-brb': [1.4, 0.66, 0.1],
  tsms: [0.66, 0.75, 0.2],
  // Accumulator side, near the rear.
  hvd: [0.4, 0.44, -0.22],
  'em-interlock': [0.45, 0.52, 0.18],
  // Inside the accumulator.
  'acc-sense': [0.85, 0.25, 0],
  'tsip-sense': [0.75, 0.25, 0],
  'ts-minus': [0.65, 0.25, 0],
  'ts-plus': [0.55, 0.25, 0],
  airs: [0.45, 0.25, 0]
};
