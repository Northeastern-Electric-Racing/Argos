/**
 * A point on the car in metres: `x` aft of the front bulkhead, `y` above the ground, `z` towards the
 * car's left of the centreline (negative is the right side). The nose points to -x.
 */
export interface CarPoint3d {
  x: number;
  y: number;
  z: number;
}

/** The box the procedural car (nose to rear frame, wheels included) fits in, per axis as [min, max]. */
export const CAR_EXTENT_3D: Readonly<Record<keyof CarPoint3d, readonly [number, number]>> = {
  x: [-0.4, 2.45],
  y: [0, 1.3],
  z: [-0.75, 0.75]
};

/**
 * Where each shutdown-loop node sits on the 3D car, keyed by `LoopNode.id`. Rough positions after the
 * spec's "Left to the builder" notes and the side-view frame drawing: GLVMS and TSMS on the right-hand
 * main hoop brace, the side BRBs either side of the main hoop, the latches in the E-box behind it, the
 * MC at the rear, BOTS at the pedal box, the inertia switch and cockpit BRB on the dash, HVD and the
 * energy meter interlock on the accumulator side, and the BMS sense points and AIRs in the accumulator.
 */
export const NODE_POSITIONS_3D: Readonly<Record<string, CarPoint3d>> = {
  glvms: { x: 1.79, y: 0.74, z: -0.27 },
  'side-brb-r': { x: 1.64, y: 0.92, z: -0.34 },
  'side-brb-l': { x: 1.64, y: 0.92, z: 0.34 },
  'bms-latch': { x: 1.63, y: 0.5, z: 0 },
  'imd-latch': { x: 1.7, y: 0.5, z: 0 },
  'bspd-latch': { x: 1.77, y: 0.5, z: 0 },
  'can-latch': { x: 1.84, y: 0.5, z: 0 },
  'mc-hvil': { x: 2.04, y: 0.37, z: 0 },
  bots: { x: 0.2, y: 0.17, z: 0 },
  inertia: { x: 0.8, y: 0.57, z: 0.12 },
  'cockpit-brb': { x: 0.8, y: 0.63, z: -0.12 },
  tsms: { x: 1.69, y: 0.74, z: -0.27 },
  hvd: { x: 1.88, y: 0.33, z: 0.2 },
  'em-interlock': { x: 1.91, y: 0.47, z: 0.12 },
  'acc-sense': { x: 1.52, y: 0.22, z: 0 },
  'tsip-sense': { x: 1.59, y: 0.22, z: 0 },
  'ts-minus': { x: 1.66, y: 0.22, z: 0 },
  'ts-plus': { x: 1.73, y: 0.22, z: 0 },
  airs: { x: 1.82, y: 0.22, z: 0 }
};
