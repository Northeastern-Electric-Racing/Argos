import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NODE_POSITIONS_3D } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { buildCar } from './car-model';
import {
  buildLoopSegments,
  buildMarkers,
  CAMERA_PRESETS,
  CarScene,
  CarSceneOptions,
  dashPieces,
  MarkerShape,
  sceneSignature,
  ViewPreset
} from './car-view-3d.model';

const MAX_PIXEL_RATIO = 2;
const MARKER_R = 0.026;
const WIRE_R = 0.009;
const DASH = 0.04;
const DASH_GAP = 0.03;
const LABEL_SIZE = 0.07;
const LABEL_LIFT = 0.065;
const PULSE_PERIOD_MS = 1200;
const TWEEN_MS = 450;
/** Pointer travel (px) under which a press counts as a click, not an orbit drag. */
const CLICK_SLOP = 5;
const UP = new Vector3(0, 1, 0);
const STATES: NodeState[] = ['closed', 'suspect', 'downstream-open', 'no-data'];

const toVec = (p: { x: number; y: number; z: number }) => new Vector3(p.x, p.y, p.z);

/**
 * The 3D shutdown-loop view: the procedural car, the loop wire through each node in series order and a
 * marker per node, with orbit controls. Renders on demand (controls moving, a camera preset tween, a
 * suspect pulsing), never in an idle loop.
 */
export function createCarScene(options: CarSceneOptions): CarScene {
  const { canvas, container, colors, reducedMotion, onPick, onContextLost } = options;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.05, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.12;
  controls.minDistance = 0.8;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  placeCamera(CAMERA_PRESETS.iso.position, CAMERA_PRESETS.iso.target);

  scene.add(new HemisphereLight(0xffffff, 0x202020, 2.2));
  const sun = new DirectionalLight(0xffffff, 2);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  const car = buildCar(colors);
  scene.add(car.group);
  const grid = new GridHelper(4.4, 22, new Color(colors.grid), new Color(colors.grid));
  grid.position.set(1.0, 0, 0);
  scene.add(grid);

  // Shared geometry and materials, so a state change only swaps meshes and never re-uploads to the GPU.
  const unitTube = new CylinderGeometry(1, 1, 1, 6, 1);
  const markerGeo: Record<MarkerShape, BufferGeometry> = {
    sphere: new IcosahedronGeometry(MARKER_R, 1),
    octahedron: new OctahedronGeometry(MARKER_R * 1.45),
    cone: new ConeGeometry(MARKER_R * 1.1, MARKER_R * 2.4, 6).rotateX(Math.PI),
    cube: new BoxGeometry(MARKER_R * 1.5, MARKER_R * 1.5, MARKER_R * 1.5)
  };
  const pickGeo = new SphereGeometry(MARKER_R * 2.2, 8, 6);
  const pickMat = new MeshBasicMaterial({ visible: false });
  const wireMat = {} as Record<NodeState, Material>;
  const solidMat = {} as Record<NodeState, Material>;
  const hollowMat = {} as Record<NodeState, Material>;
  for (const state of STATES) {
    const color = new Color(colors.states[state]);
    wireMat[state] = new MeshBasicMaterial({ color });
    solidMat[state] = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 });
    hollowMat[state] = new MeshBasicMaterial({ color, wireframe: true });
  }
  const textures = new Map<string, Texture>();
  const labelMats = new Map<string, SpriteMaterial>();
  const labelMaterial = (text: string): SpriteMaterial => {
    let m = labelMats.get(text);
    if (!m) {
      const map = badgeTexture(text, colors.label, colors.labelBg);
      textures.set(text, map);
      m = new SpriteMaterial({ map, depthTest: false, transparent: true });
      labelMats.set(text, m);
    }
    return m;
  };
  const ringMap = ringTexture(colors.focus);
  const ring = new Sprite(new SpriteMaterial({ map: ringMap, depthTest: false, transparent: true }));
  ring.scale.setScalar(MARKER_R * 6);
  ring.renderOrder = 11;
  ring.visible = false;
  scene.add(ring);

  const loop = new Group();
  scene.add(loop);
  let pickables: Object3D[] = [];
  let suspects: Object3D[] = [];
  let signature = '';
  let selectedId: string | null = null;

  function update(nodes: readonly NodeStatus[]): void {
    const next = sceneSignature(nodes);
    if (next === signature) return;
    signature = next;
    loop.clear();
    pickables = [];
    suspects = [];

    for (const s of buildLoopSegments(nodes, NODE_POSITIONS_3D)) {
      const pieces = s.dashed ? dashPieces(s.from, s.to, DASH, DASH_GAP) : [[s.from, s.to] as const];
      for (const [a, b] of pieces) loop.add(tubeMesh(toVec(a), toVec(b), wireMat[s.state]));
    }
    const mismatched = new Set(nodes.filter((s) => s.mismatch).map((s) => s.node.id));
    for (const m of buildMarkers(nodes, NODE_POSITIONS_3D)) {
      const at = toVec(m.position);
      const mesh = new Mesh(markerGeo[m.shape], (m.hollow ? hollowMat : solidMat)[m.state]);
      mesh.position.copy(at);
      const pick = new Mesh(pickGeo, pickMat);
      pick.position.copy(at);
      pick.userData['nodeId'] = m.id;
      const label = new Sprite(labelMaterial(mismatched.has(m.id) ? `${m.order}!` : String(m.order)));
      label.position.copy(at).add(new Vector3(0, LABEL_LIFT, 0));
      label.scale.set(LABEL_SIZE * (mismatched.has(m.id) ? 1.4 : 1), LABEL_SIZE, 1);
      label.renderOrder = 10;
      label.userData['nodeId'] = m.id;
      loop.add(mesh, pick, label);
      pickables.push(pick, label);
      if (m.state === 'suspect') suspects.push(mesh);
    }
    placeRing();
    requestRender();
  }

  function tubeMesh(a: Vector3, b: Vector3, material: Material): Mesh {
    const dir = b.clone().sub(a);
    const mesh = new Mesh(unitTube, material);
    mesh.scale.set(WIRE_R, dir.length(), WIRE_R);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
    return mesh;
  }

  function placeRing(): void {
    const p = selectedId ? NODE_POSITIONS_3D[selectedId] : undefined;
    ring.visible = !!p;
    if (p) ring.position.copy(toVec(p));
  }

  function setSelected(id: string | null): void {
    selectedId = id;
    placeRing();
    requestRender();
  }

  // Camera presets, eased unless the user prefers reduced motion
  let tween: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; start: number } | undefined;
  function placeCamera(position: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) {
    camera.position.copy(toVec(position));
    controls.target.copy(toVec(target));
    controls.update();
  }
  function setView(preset: ViewPreset): void {
    const { position, target } = CAMERA_PRESETS[preset];
    if (reducedMotion) {
      placeCamera(position, target);
    } else {
      tween = {
        from: [camera.position.clone(), controls.target.clone()],
        to: [toVec(position), toVec(target)],
        start: performance.now()
      };
    }
    requestRender();
  }
  function stepTween(now: number): boolean {
    if (!tween) return false;
    const t = Math.min(1, (now - tween.start) / TWEEN_MS);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    camera.position.lerpVectors(tween.from[0], tween.to[0], e);
    controls.target.lerpVectors(tween.from[1], tween.to[1], e);
    if (t >= 1) tween = undefined;
    return true;
  }

  function pulse(now: number): boolean {
    if (reducedMotion || !suspects.length) return false;
    const k = 1 + 0.3 * (0.5 + 0.5 * Math.sin((now / PULSE_PERIOD_MS) * 2 * Math.PI));
    for (const m of suspects) m.scale.setScalar(k);
    return true;
  }

  // Render on demand
  let frame = 0;
  let disposed = false;
  function requestRender(): void {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  }
  function tick(now: number): void {
    frame = 0;
    const tweening = stepTween(now);
    const moving = controls.update();
    const pulsing = pulse(now);
    renderer.render(scene, camera);
    if (tweening || moving || pulsing) requestRender();
  }
  controls.addEventListener('change', requestRender);

  // Size follows the container
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // Click (not drag) to pick a node; pointer cursor over one
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hit = (e: PointerEvent): string | null => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const [first] = raycaster.intersectObjects(pickables, false);
    return (first?.object.userData['nodeId'] as string | undefined) ?? null;
  };
  let down: { x: number; y: number } | undefined;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < CLICK_SLOP) onPick(hit(e));
    down = undefined;
  };
  const onMove = (e: PointerEvent) => {
    if (e.buttons === 0) canvas.style.cursor = hit(e) ? 'pointer' : 'grab';
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    onContextLost();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('webglcontextlost', onLost);

  function dispose(): void {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('webglcontextlost', onLost);
    controls.removeEventListener('change', requestRender);
    controls.dispose();
    loop.clear();
    car.dispose();
    grid.geometry.dispose();
    (grid.material as Material).dispose();
    [unitTube, pickGeo, ...Object.values(markerGeo)].forEach((g) => g.dispose());
    [
      pickMat,
      ring.material,
      ...labelMats.values(),
      ...STATES.flatMap((s) => [wireMat[s], solidMat[s], hollowMat[s]])
    ].forEach((m) => m.dispose());
    [ringMap, ...textures.values()].forEach((t) => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { update, setSelected, setView, dispose };
}

/** A rounded badge with `text`, for a node's order number. */
function badgeTexture(text: string, fg: string, bg: string): Texture {
  const h = 64;
  const w = Math.round(h * (text.length > 2 ? 1.4 : 1));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 16);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = fg;
  ctx.font = `700 ${h * 0.5}px Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A ring drawn around the selected node. */
function ringTexture(color: string): Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
