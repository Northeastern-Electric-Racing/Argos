import {
  Box3,
  BoxGeometry,
  BufferGeometry,
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
  OctahedronGeometry,
  PerspectiveCamera,
  Scene,
  TOUCH,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NODE_POSITIONS_3D, Vec3 } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { CarScene, CarSceneOptions } from './car-scene.types';
import { nearestPoint, ScreenPoint, VIEW_FOV_DEG, viewPose, ViewPreset } from './car-view-3d.projection';
import {
  buildLoopSegments,
  buildMarkers,
  CarSceneError,
  dashPieces,
  MarkerShape,
  RenderLoop,
  sceneSignature,
  WIRE_RADIUS
} from './car-view-3d.utils';
import { buildCar } from './procedural-car';

const MAX_PIXEL_RATIO = 2;
const MARKER_R = 0.03;
const HIGHLIGHT_SCALE = 1.7;
const TWEEN_MS = 450;
/** How close the camera comes to a selected loop node, and how close the user may zoom, as parts of the fit distance. */
const FOCUS_DISTANCE = 0.6;
const MIN_DISTANCE = 0.3;
const MAX_DISTANCE = 2;
/** Pointer travel (px) under which a press counts as a click, not an orbit drag. */
const CLICK_SLOP = 5;
const UP = new Vector3(0, 1, 0);
const STATES: NodeState[] = ['closed', 'suspect', 'downstream-open', 'no-data'];
/** Suspect markers draw last and through everything, so the frame and nearer markers never hide the culprit. */
const SUSPECT_RENDER_ORDER = 10;

const toVec = (p: Vec3) => new Vector3(p[0], p[1], p[2]);
const toVec3 = (v: Vector3): Vec3 => [v.x, v.y, v.z];

/**
 * The 3D shutdown-loop view: the procedural car in the shared frame, the loop wire through each loop node in series
 * order and a marker per loop node, with orbit controls. Renders on demand only (a camera tween, orbit damping, a
 * resize, a state or highlight change), never in an idle loop; after each frame it reports where each marker is
 * on screen, for the HTML badges and for picking.
 */
export function createCarScene(options: CarSceneOptions): CarScene {
  const { canvas, container, colours, reducedMotion, coarsePointer, onFrame, onPick, onHover, onContextLost } = options;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (cause) {
    throw new CarSceneError({ cause });
  }
  const loseContext = () => {
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
  };
  try {
    return buildScene(renderer, loseContext);
  } catch (err) {
    renderer.dispose();
    loseContext();
    throw err;
  }

  function buildScene(renderer: WebGLRenderer, loseContext: () => void): CarScene {
    let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(VIEW_FOV_DEG, 1, 0.05, 50);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    if (coarsePointer) {
      // One finger scrolls the page, two orbit and zoom. OrbitControls sets touch-action inline, so override inline.
      controls.touches = { ONE: null, TWO: TOUCH.DOLLY_ROTATE };
      canvas.style.touchAction = 'pan-y';
    }

    scene.add(new HemisphereLight(0xffffff, 0x202020, 2.2));
    const sun = new DirectionalLight(0xffffff, 2);
    sun.position.set(3, 4, 2);
    scene.add(sun);

    const car = buildCar(colours);
    scene.add(car.group);
    // The view fits the car and every marker.
    const bounds = new Box3().setFromObject(car.group);
    Object.values(NODE_POSITIONS_3D).forEach((p) => bounds.expandByPoint(toVec(p)));
    const size = bounds.getSize(new Vector3());
    const grid = new GridHelper(
      Math.ceil(Math.max(size.x, size.z) + 1),
      22,
      new Color(colours.grid),
      new Color(colours.grid)
    );
    grid.position.set(bounds.getCenter(new Vector3()).x, 0, bounds.getCenter(new Vector3()).z);
    const gridMat = grid.material as Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.45;
    scene.add(grid);

    // Shared geometry and materials, so a state change only swaps meshes and never re-uploads to the GPU.
    const unitTube = new CylinderGeometry(1, 1, 1, 6, 1);
    const markerGeo: Record<MarkerShape, BufferGeometry> = {
      sphere: new IcosahedronGeometry(MARKER_R, 1),
      octahedron: new OctahedronGeometry(MARKER_R * 1.45),
      cone: new ConeGeometry(MARKER_R * 1.1, MARKER_R * 2.4, 6).rotateX(Math.PI),
      box: new BoxGeometry(MARKER_R * 1.5, MARKER_R * 1.5, MARKER_R * 1.5)
    };
    const wireMat = {} as Record<NodeState, Material>;
    const solidMat = {} as Record<NodeState, Material>;
    const hollowMat = {} as Record<NodeState, Material>;
    for (const state of STATES) {
      const color = new Color(colours.states[state]);
      const onTop = state === 'suspect' ? { depthTest: false, depthWrite: false } : {};
      wireMat[state] = new MeshBasicMaterial({ color });
      solidMat[state] = new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        ...onTop
      });
      hollowMat[state] = new MeshBasicMaterial({ color, wireframe: true, ...onTop });
    }

    const loop = new Group();
    scene.add(loop);
    let markers = new Map<string, { mesh: Mesh; position: Vector3 }>();
    let signature = '';
    let highlightId: string | null = null;
    let interactive = true;

    function setStatuses(nodes: readonly NodeStatus[]): void {
      const next = sceneSignature(nodes);
      if (next === signature) return;
      signature = next;
      loop.clear();
      markers = new Map();

      for (const s of buildLoopSegments(nodes, NODE_POSITIONS_3D)) {
        const pieces = s.dash ? dashPieces(s.from, s.to, s.dash[0], s.dash[1]) : [[s.from, s.to] as const];
        const radius = WIRE_RADIUS[s.emphasis];
        for (const [a, b] of pieces) loop.add(tubeMesh(toVec(a), toVec(b), radius, wireMat[s.state]));
      }
      for (const m of buildMarkers(nodes, NODE_POSITIONS_3D)) {
        const position = toVec(m.position);
        const mesh = new Mesh(markerGeo[m.shape], (m.hollow ? hollowMat : solidMat)[m.state]);
        mesh.position.copy(position);
        if (m.state === 'suspect') mesh.renderOrder = SUSPECT_RENDER_ORDER;
        loop.add(mesh);
        markers.set(m.id, { mesh, position });
      }
      applyHighlight();
      render.request();
    }

    function tubeMesh(a: Vector3, b: Vector3, radius: number, material: Material): Mesh {
      const dir = b.clone().sub(a);
      const mesh = new Mesh(unitTube, material);
      mesh.scale.set(radius, dir.length(), radius);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
      return mesh;
    }

    function applyHighlight(): void {
      for (const [id, m] of markers) m.mesh.scale.setScalar(id === highlightId ? HIGHLIGHT_SCALE : 1);
    }

    function setHighlight(id: string | null): void {
      if (id === highlightId) return;
      highlightId = id;
      applyHighlight();
      render.request();
    }

    // Camera: presets fit the car; a selection closes in on its loop node. Eased unless reduced motion.
    let preset: ViewPreset = 'iso';
    /** The user has orbited since the last preset, so a resize keeps their camera instead of refitting. */
    let orbited = false;
    let fitDistance = 1;
    let tween: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; start: number } | undefined;

    function moveCamera(position: Vector3, target: Vector3, animate: boolean): void {
      if (reducedMotion || !animate) {
        tween = undefined;
        camera.position.copy(position);
        controls.target.copy(target);
        controls.update();
      } else {
        tween = {
          from: [camera.position.clone(), controls.target.clone()],
          to: [position, target],
          start: performance.now()
        };
      }
      render.request();
    }

    function setView(next: ViewPreset, animate = true): void {
      preset = next;
      orbited = false;
      const pose = viewPose(toVec3(bounds.min), toVec3(bounds.max), next, camera.aspect, VIEW_FOV_DEG);
      fitDistance = pose.distance;
      controls.minDistance = pose.distance * MIN_DISTANCE;
      controls.maxDistance = pose.distance * MAX_DISTANCE;
      camera.near = pose.distance / 100;
      camera.far = pose.distance * 10;
      camera.updateProjectionMatrix();
      moveCamera(toVec(pose.position), toVec(pose.target), animate);
    }

    function focus(id: string | null): void {
      const p = id ? NODE_POSITIONS_3D[id] : undefined;
      if (!p) return;
      const target = toVec(p);
      const dir = camera.position.clone().sub(controls.target).normalize();
      orbited = true;
      moveCamera(target.clone().addScaledVector(dir, fitDistance * FOCUS_DISTANCE), target, true);
    }

    function stepTween(now: number): boolean {
      if (!tween) return false;
      const t = Math.min(1, Math.max(0, (now - tween.start) / TWEEN_MS));
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      camera.position.lerpVectors(tween.from[0], tween.to[0], e);
      controls.target.lerpVectors(tween.from[1], tween.to[1], e);
      if (t >= 1) tween = undefined;
      return true;
    }

    let points: ScreenPoint[] = [];
    function project(): ScreenPoint[] {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const v = new Vector3();
      return [...markers].map(([id, m]) => {
        v.copy(m.position).project(camera);
        const x = ((v.x + 1) / 2) * w;
        const y = ((1 - v.y) / 2) * h;
        return { id, x, y, z: v.z, visible: v.z > -1 && v.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
      });
    }

    const render = new RenderLoop((now) => {
      const tweening = stepTween(now);
      // With damping on, update() keeps reporting movement until the orbit settles.
      const moving = controls.update();
      renderer.render(scene, camera);
      points = project();
      onFrame(points);
      return tweening || moving;
    });
    const onControlsChange = () => render.request();
    const onControlsStart = () => {
      orbited = true;
      tween = undefined;
    };
    // Keep the orbit target on the car, so panning never loses it.
    const clampTarget = () => controls.target.clamp(bounds.min, bounds.max);
    controls.addEventListener('change', onControlsChange);
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', clampTarget);

    // Size follows the container; the preset refits unless the user has moved the camera.
    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      if (ratio !== pixelRatio) renderer.setPixelRatio((pixelRatio = ratio));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!orbited) setView(preset, false);
      render.request();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    // Primary-button click (not a drag) picks the nearest marker on screen; hover reports the marker under it.
    let down: { id: number; x: number; y: number } | undefined;
    let hovered: string | null = null;
    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top] as const;
    };
    const hover = (id: string | null) => {
      if (id === hovered) return;
      hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'grab';
      onHover(id);
    };
    const onDown = (e: PointerEvent) => {
      // A second finger, or a non-primary button, is an orbit or zoom, never a pick.
      down = e.button === 0 && e.isPrimary && !down ? { id: e.pointerId, x: e.clientX, y: e.clientY } : undefined;
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = undefined;
      if (!interactive || !start || start.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) >= CLICK_SLOP) return;
      onPick(nearestPoint(points, ...local(e)));
    };
    const onMove = (e: PointerEvent) => {
      if (interactive && e.buttons === 0 && e.pointerType !== 'touch') hover(nearestPoint(points, ...local(e)));
    };
    const onLeave = () => hover(null);
    const onCancel = () => (down = undefined);
    const onLost = (e: Event) => {
      e.preventDefault();
      onContextLost();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('webglcontextlost', onLost);

    function setInteractive(on: boolean): void {
      interactive = on;
      if (!on) hover(null);
    }

    let disposed = false;
    function dispose(): void {
      if (disposed) return;
      disposed = true;
      render.dispose();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      controls.removeEventListener('change', onControlsChange);
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', clampTarget);
      controls.dispose();
      loop.clear();
      car.dispose();
      grid.geometry.dispose();
      gridMat.dispose();
      [unitTube, ...Object.values(markerGeo)].forEach((g) => g.dispose());
      STATES.flatMap((s) => [wireMat[s], solidMat[s], hollowMat[s]]).forEach((m) => m.dispose());
      renderer.dispose();
      loseContext();
    }

    return { setStatuses, setHighlight, focus, setView: (p) => setView(p), setInteractive, dispose };
  }
}
