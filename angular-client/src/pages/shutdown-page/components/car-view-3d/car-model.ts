import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  CylinderGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3
} from 'three';
import { CarPoint3d } from '../../shutdown-loop.positions-3d';
import { SceneColors } from './car-view-3d.model';

/**
 * A low-poly FSAE-style car built from primitives, in car metres (see CarPoint3d): a tube space frame
 * (front bulkhead, front hoop, main hoop with its rear braces, side impact tubes, rear frame), a nose
 * cone, a dash and steering wheel, the cockpit opening, the accumulator, E-box and motor controller as
 * see-through boxes so the nodes inside stay visible, suspension arms and four wheels.
 * Not CAD: proportions follow the side-view frame drawing loosely.
 */

const UP = new Vector3(0, 1, 0);
const FRAME_TUBE_R = 0.011;
const ARM_TUBE_R = 0.007;
const WHEEL_R = 0.23;
const WHEEL_W = 0.19;
const FRONT_AXLE_X = 0.52;
const REAR_AXLE_X = 2.15;
const FRONT_TRACK_HALF = 0.62;
const REAR_TRACK_HALF = 0.6;

/** Frame nodes on the left side (z >= 0); the right side mirrors them. */
const P = {
  fbhBottom: [0, 0.1, 0.17],
  fbhTop: [0, 0.42, 0.15],
  fhBottom: [0.84, 0.08, 0.27],
  fhSide: [0.84, 0.32, 0.3],
  fhTop: [0.86, 0.66, 0.2],
  mhBottom: [1.53, 0.06, 0.3],
  mhSide: [1.55, 0.32, 0.34],
  mhShoulder: [1.62, 1.02, 0.3],
  mhTop: [1.66, 1.22, 0.16],
  braceTop: [1.64, 1.12, 0.23],
  braceBottom: [2.06, 0.32, 0.23],
  rearTop: [2.27, 0.34, 0.22],
  rearBottom: [2.27, 0.08, 0.2]
} as const satisfies Record<string, readonly [number, number, number]>;
type FramePoint = keyof typeof P;

/** Tubes along each side. */
const SIDE_TUBES: [FramePoint, FramePoint][] = [
  ['fbhBottom', 'fbhTop'],
  ['fbhBottom', 'fhBottom'],
  ['fbhTop', 'fhSide'],
  ['fbhBottom', 'fhSide'],
  ['fbhTop', 'fhTop'],
  ['fhBottom', 'fhSide'],
  ['fhSide', 'fhTop'],
  // Side impact structure
  ['fhSide', 'mhSide'],
  ['fhBottom', 'mhBottom'],
  ['fhSide', 'mhBottom'],
  ['fhTop', 'mhSide'],
  // Main hoop and its rear brace
  ['mhBottom', 'mhSide'],
  ['mhSide', 'mhShoulder'],
  ['mhShoulder', 'mhTop'],
  ['braceTop', 'braceBottom'],
  // Rear frame
  ['mhSide', 'rearTop'],
  ['mhBottom', 'rearBottom'],
  ['mhSide', 'rearBottom'],
  ['rearBottom', 'rearTop']
];
/** Tubes across the car, left node to its mirror. */
const CROSS_TUBES: FramePoint[] = [
  'fbhBottom',
  'fbhTop',
  'fhBottom',
  'fhTop',
  'mhBottom',
  'mhSide',
  'mhTop',
  'rearBottom',
  'rearTop'
];

const v = (p: readonly [number, number, number], side: 1 | -1 = 1) => new Vector3(p[0], p[1], p[2] * side);
const vp = (p: CarPoint3d) => new Vector3(p.x, p.y, p.z);

export interface CarModel {
  group: Group;
  /** Every geometry and material the car made, for dispose(). */
  dispose(): void;
}

export function buildCar(colors: SceneColors): CarModel {
  const group = new Group();
  group.name = 'car';
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const keep = <T extends BufferGeometry>(g: T): T => (geometries.push(g), g);
  const mat = <T extends Material>(m: T): T => (materials.push(m), m);

  const frameMat = mat(new MeshStandardMaterial({ color: new Color(colors.frame), roughness: 0.45, metalness: 0.35 }));
  const bodyMat = mat(
    new MeshStandardMaterial({ color: new Color(colors.body), roughness: 0.7, flatShading: true, side: DoubleSide })
  );
  const armMat = mat(new MeshStandardMaterial({ color: new Color(colors.rim), roughness: 0.5, metalness: 0.3 }));
  const tyreMat = mat(new MeshStandardMaterial({ color: new Color(colors.tyre), roughness: 0.95, flatShading: true }));
  const rimMat = mat(new MeshStandardMaterial({ color: new Color(colors.rim), roughness: 0.4, metalness: 0.5 }));

  // One unit cylinder, scaled per tube.
  const unitTube = keep(new CylinderGeometry(1, 1, 1, 8, 1));
  const tube = (a: Vector3, b: Vector3, radius: number, material: Material) => {
    const dir = b.clone().sub(a);
    const mesh = new Mesh(unitTube, material);
    mesh.scale.set(radius, dir.length(), radius);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
    group.add(mesh);
  };

  // Space frame
  for (const side of [1, -1] as const) {
    for (const [a, b] of SIDE_TUBES) tube(v(P[a], side), v(P[b], side), FRAME_TUBE_R, frameMat);
  }
  for (const p of CROSS_TUBES) tube(v(P[p], 1), v(P[p], -1), FRAME_TUBE_R, frameMat);

  // Nose cone: from the front bulkhead to a blunt tip
  const nose = keep(noseGeometry());
  group.add(new Mesh(nose, bodyMat));

  // Dash panel just behind the front hoop, and the steering wheel
  const dash = new Mesh(keep(new BoxGeometry(0.03, 0.14, 0.4)), bodyMat);
  dash.position.set(0.875, 0.57, 0);
  group.add(dash);
  const wheel = new Mesh(keep(new TorusGeometry(0.11, 0.012, 6, 20)), armMat);
  wheel.position.set(1.0, 0.56, 0);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = 0.35;
  group.add(wheel);
  tube(new Vector3(0.88, 0.6, 0), new Vector3(1.0, 0.56, 0), 0.01, armMat);

  // Cockpit opening: a rim between the front and main hoops
  const rim = new CatmullRomCurve3(
    [
      [0.9, 0.66, 0],
      [0.98, 0.65, 0.2],
      [1.25, 0.6, 0.29],
      [1.5, 0.62, 0.28],
      [1.57, 0.64, 0],
      [1.5, 0.62, -0.28],
      [1.25, 0.6, -0.29],
      [0.98, 0.65, -0.2]
    ].map(([x, y, z]) => new Vector3(x, y, z)),
    true
  );
  group.add(new Mesh(keep(new TubeGeometry(rim, 48, 0.014, 6, true)), bodyMat));

  // Accumulator, E-box and motor controller: see-through boxes with solid edges
  const box = (min: CarPoint3d, max: CarPoint3d, edgeColor: string, name: string) => {
    const size = vp(max).sub(vp(min));
    const geo = keep(new BoxGeometry(size.x, size.y, size.z));
    const fill = new Mesh(
      geo,
      mat(
        new MeshStandardMaterial({
          color: new Color(colors.body),
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          roughness: 0.8
        })
      )
    );
    const edges = new LineSegments(
      keep(new EdgesGeometry(geo)),
      mat(new LineBasicMaterial({ color: new Color(edgeColor) }))
    );
    const centre = vp(min).add(vp(max)).multiplyScalar(0.5);
    fill.position.copy(centre);
    edges.position.copy(centre);
    fill.name = name;
    group.add(fill, edges);
  };
  box({ x: 1.46, y: 0.09, z: -0.22 }, { x: 1.92, y: 0.31, z: 0.22 }, colors.hv, 'accumulator');
  box({ x: 1.59, y: 0.36, z: -0.13 }, { x: 1.89, y: 0.58, z: 0.13 }, colors.edge, 'e-box');
  box({ x: 1.96, y: 0.14, z: -0.11 }, { x: 2.13, y: 0.34, z: 0.11 }, colors.edge, 'motor-controller');

  // Wheels and double-wishbone arms
  const tyreGeo = keep(new CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 20));
  const rimGeo = keep(new CylinderGeometry(WHEEL_R * 0.6, WHEEL_R * 0.6, WHEEL_W + 0.006, 12));
  for (const [axleX, trackHalf, frameHalf] of [
    [FRONT_AXLE_X, FRONT_TRACK_HALF, 0.22],
    [REAR_AXLE_X, REAR_TRACK_HALF, 0.21]
  ]) {
    for (const side of [1, -1]) {
      const z = trackHalf * side;
      for (const [geo, material] of [
        [tyreGeo, tyreMat],
        [rimGeo, rimMat]
      ] as const) {
        const m = new Mesh(geo, material);
        m.position.set(axleX, WHEEL_R, z);
        m.rotation.x = Math.PI / 2;
        group.add(m);
      }
      const hubZ = (trackHalf - WHEEL_W / 2 - 0.02) * side;
      const fz = frameHalf * side;
      for (const [hubY, frameY, spread] of [
        [0.31, 0.3, 0.12],
        [0.14, 0.12, 0.15]
      ]) {
        const hub = new Vector3(axleX, hubY, hubZ);
        tube(hub, new Vector3(axleX - spread, frameY, fz), ARM_TUBE_R, armMat);
        tube(hub, new Vector3(axleX + spread, frameY, fz), ARM_TUBE_R, armMat);
      }
    }
  }

  return {
    group,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    }
  };
}

/** A tapered box from the front bulkhead (x = 0) to the tip, flat-shaded. */
function noseGeometry(): BufferGeometry {
  // Back ring (at the bulkhead) then front ring (the tip), each: bottom-left, bottom-right, top-right, top-left.
  const back = [
    [0, 0.08, 0.19],
    [0, 0.08, -0.19],
    [0, 0.44, -0.17],
    [0, 0.44, 0.17]
  ];
  const tip = [
    [-0.36, 0.11, 0.06],
    [-0.36, 0.11, -0.06],
    [-0.36, 0.2, -0.05],
    [-0.36, 0.2, 0.05]
  ];
  const quads: number[][][] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quads.push([back[i], tip[i], tip[j], back[j]]);
  }
  quads.push([tip[0], tip[3], tip[2], tip[1]]);
  const positions: number[] = [];
  for (const [a, b, c, d] of quads) positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
