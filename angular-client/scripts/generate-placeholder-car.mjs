// Builds the placeholder car model at src/assets/models/car.glb: a rough open-wheel car in the shared frame
// (shutdown-loop.positions-3d.ts, docs/spec/shutdown-loop-page/car-model.md): metres, +X to the driver's left,
// +Y up, +Z forward, origin on the ground under the rear axle centre. It carries three loop node anchors, each a
// few cm off its table entry, so the load summary shows "from the model" working.
//
// Stand-in for the throwaway only; the asset strategy for real CAD is decided at adoption (ADR 0010).
//
// Run from angular-client/:  node scripts/generate-placeholder-car.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// GLTFExporter reads its output Blob with the browser's FileReader; Node has Blob but no FileReader.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const OUT = fileURLToPath(new URL('../src/assets/models/car.glb', import.meta.url));

// Stand-in "CAD" colours, deliberately not the app theme (the viewer's theme/ghost modes repaint them).
const mat = (name, color, extra = {}) =>
  new THREE.MeshStandardMaterial({ name, color, roughness: 0.6, metalness: 0.1, ...extra });
const bodyMat = mat('body', 0xc62828);
const carbonMat = mat('carbon', 0x2b2b2b);
const tyreMat = mat('tyre', 0x151515, { roughness: 0.9 });
const steelMat = mat('steel', 0x9e9e9e, { metalness: 0.6, roughness: 0.4 });
const accMat = mat('accumulator', 0xf9a825);

const car = new THREE.Group();
car.name = 'car';

/** A closed loft through rectangular stations [x, halfWidth, yBottom, yTop], nose to tail. */
function loft(stations) {
  const positions = [];
  for (const [x, hw, yb, yt] of stations) {
    positions.push(x, yb, -hw, x, yb, hw, x, yt, hw, x, yt, -hw);
  }
  const index = [];
  for (let s = 0; s < stations.length - 1; s++) {
    const a = s * 4;
    const b = a + 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      index.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  const last = (stations.length - 1) * 4;
  index.push(0, 2, 1, 0, 3, 2, last, last + 1, last + 2, last, last + 2, last + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  // Flat-ish shading: split vertices so each face gets its own normal.
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

function add(name, geometry, material, [x, y, z] = [0, 0, 0], rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  if (rotation) mesh.rotation.set(...rotation);
  car.add(mesh);
  return mesh;
}

const box = (name, material, [x0, y0, z0], [x1, y1, z1]) =>
  add(name, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);

/** A tube along points (metres). */
const tube = (name, material, points, radius = 0.018) =>
  add(
    name,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
        false,
        'catmullrom',
        0.1
      ),
      24,
      radius,
      8
    ),
    material
  );

// Monocoque / body, rear to nose.
add(
  'body',
  loft([
    [-0.1, 0.26, 0.1, 0.45],
    [0.35, 0.32, 0.06, 0.5],
    [0.7, 0.36, 0.05, 0.56],
    [1.1, 0.34, 0.05, 0.52],
    [1.5, 0.28, 0.06, 0.56],
    [1.9, 0.2, 0.08, 0.42],
    [2.25, 0.1, 0.12, 0.26]
  ]),
  bodyMat
);

// Sidepods.
for (const side of [-1, 1]) {
  const s = side > 0 ? 'right' : 'left';
  box(`sidepod-${s}`, bodyMat, [0.3, 0.1, side > 0 ? 0.34 : -0.52], [1.1, 0.4, side > 0 ? 0.52 : -0.34]);
}

// Main hoop and front hoop (roll hoops).
tube('main-hoop', steelMat, [
  [0.66, 0.5, -0.3],
  [0.66, 1.0, -0.26],
  [0.66, 1.2, -0.1],
  [0.66, 1.2, 0.1],
  [0.66, 1.0, 0.26],
  [0.66, 0.5, 0.3]
]);
tube('front-hoop', steelMat, [
  [1.45, 0.52, -0.26],
  [1.45, 0.7, -0.18],
  [1.45, 0.74, 0],
  [1.45, 0.7, 0.18],
  [1.45, 0.52, 0.26]
]);
tube('main-hoop-brace', steelMat, [
  [0.66, 1.18, 0],
  [0.3, 0.5, 0]
]);

// Accumulator (shows through in ghost mode).
box('accumulator', accMat, [0.39, 0.08, -0.24], [0.91, 0.34, 0.24]);

// Wheels and suspension.
const WHEEL_R = 0.23;
const WHEEL_W = 0.19;
for (const [axle, ax] of [
  ['rear', 0],
  ['front', 1.55]
]) {
  for (const side of [-1, 1]) {
    const s = side > 0 ? 'right' : 'left';
    const z = side * 0.62;
    add(
      `wheel-${axle}-${s}`,
      new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 24),
      tyreMat,
      [ax, WHEEL_R, z],
      [Math.PI / 2, 0, 0]
    );
    const inner = side * 0.28;
    tube(
      `wishbone-upper-${axle}-${s}`,
      steelMat,
      [
        [ax - 0.12, 0.36, inner],
        [ax, 0.32, z - side * 0.08],
        [ax + 0.12, 0.36, inner]
      ],
      0.01
    );
    tube(
      `wishbone-lower-${axle}-${s}`,
      steelMat,
      [
        [ax - 0.14, 0.14, inner],
        [ax, 0.14, z - side * 0.08],
        [ax + 0.14, 0.14, inner]
      ],
      0.01
    );
  }
}

// Wings.
box('front-wing', carbonMat, [2.1, 0.05, -0.68], [2.45, 0.09, 0.68]);
for (const side of [-1, 1]) {
  box(
    `front-wing-endplate-${side > 0 ? 'right' : 'left'}`,
    carbonMat,
    [2.08, 0.05, side * 0.68 - 0.01],
    [2.47, 0.22, side * 0.68 + 0.01]
  );
  box(
    `rear-wing-endplate-${side > 0 ? 'right' : 'left'}`,
    carbonMat,
    [-0.4, 0.62, side * 0.46 - 0.01],
    [0.02, 1.02, side * 0.46 + 0.01]
  );
  box(
    `rear-wing-strut-${side > 0 ? 'right' : 'left'}`,
    steelMat,
    [-0.12, 0.42, side * 0.18 - 0.01],
    [-0.08, 0.86, side * 0.18 + 0.01]
  );
}
box('rear-wing', carbonMat, [-0.38, 0.86, -0.46], [0, 0.96, 0.46]);

// The parts above are drawn with +X forward and +Z to the driver's right. Bake a quarter turn into every part so
// the file is in the shared frame with no node rotations: x' = -z, z' = x.
const toSharedFrame = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
for (const mesh of car.children) {
  mesh.updateMatrix();
  mesh.geometry = mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(toSharedFrame, mesh.matrix));
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
}

// Loop node anchors, in the shared frame. An empty named as documented, an empty named the way Blender exports a
// duplicate, and a small two-material part (a group anchor, placed at its bounding-box centre).
const empty = (name, [x, y, z]) => {
  const anchor = new THREE.Object3D();
  anchor.name = name;
  anchor.position.set(x, y, z);
  car.add(anchor);
};
empty('shutdown:tsms', [-0.2, 0.78, 0.69]);
empty('Shutdown_Side_BRB_R.001', [-0.36, 0.92, 0.66]);
const hvd = new THREE.Group();
hvd.name = 'shutdown:hvd';
const hvdBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.1), steelMat);
hvdBody.name = 'hvd-body';
const hvdHandle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.06), mat('hvd-handle', 0xff6f00));
hvdHandle.name = 'hvd-handle';
hvdHandle.position.set(0.04, 0, 0);
hvd.add(hvdBody, hvdHandle);
hvd.position.set(0.25, 0.44, 0.42);
car.add(hvd);

const exporter = new GLTFExporter();
exporter.parse(
  car,
  (glb) => {
    writeFileSync(OUT, Buffer.from(glb));
    console.log(`wrote ${OUT} (${glb.byteLength} bytes)`);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
  { binary: true }
);
