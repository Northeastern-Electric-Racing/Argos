import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  Scene,
  SphereGeometry,
  Texture,
  TOUCH,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { NODE_POSITIONS_3D, Vec3 } from '../../shutdown-loop.positions-3d';
import { NodeState } from '../../shutdown-loop.utils';
import { prepareModel } from './car-model';
import { CarModelResult, CarScene, CarSceneFactory, CarSceneOptions, ScreenPoint } from './car-scene.types';
import {
  fitDistanceToPoints,
  nearestPoint,
  PICK_REACH_PX,
  VIEW_DIRECTIONS,
  VIEW_FOV_DEG,
  ViewPreset
} from './car-view-3d.projection';
import {
  CarSceneError,
  dashPieces,
  MARKER_SHAPES,
  MarkerShape,
  markerKey,
  MaterialMode,
  modelSummary,
  resolveNodePositions,
  SceneNode,
  SceneStatus,
  segmentKey,
  segmentStyle
} from './car-view-3d.utils';
import { loadCarModel } from './load-car-model';
import { RenderScheduler } from './render-scheduler';

// The three.js half of the glTF 3D car view. Only ever loaded with a dynamic import, so three stays out of the
// page's initial bundle. It draws the loop wiring at once from the position table, then adds the car model when it
// has loaded; it renders only when something visible changes.

const MAX_PIXEL_RATIO = 2;
const FOV = VIEW_FOV_DEG;
/** Folder holding the Draco decoder (wrapper + wasm), served from our own assets. */
const DRACO_PATH = 'assets/draco/';
/** Marker size in metres (model space). */
const MARKER_SIZE = 0.035;
const HIGHLIGHT_SCALE = 1.7;
/** Room left around the car when a preset frames it. */
const FIT_MARGIN = 1.08;
const GHOST_OPACITY = 0.18;
/** Loop wiring and markers draw over the car body in every material mode, so the cause is never hidden. */
const ORDER = { wire: 2, marker: 3, ring: 4 } as const;
const Y_AXIS = new Vector3(0, 1, 0);

interface Marker {
  mesh: Mesh;
  material: MeshStandardMaterial;
  /** Ring in the mismatch colour, shown while the reading disagrees with the loop. */
  mismatch: Mesh;
}

export const createCarScene: CarSceneFactory = async (options) => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (cause) {
    throw new CarSceneError('webgl', { cause });
  }
  const scene = new ThreeCarScene(options, renderer);
  try {
    scene.init();
    return scene;
  } catch (cause) {
    scene.dispose();
    throw new CarSceneError('init', { cause });
  }
};

class ThreeCarScene implements CarScene {
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 0.01, 100);
  private controls?: OrbitControls;
  private resizeObserver?: ResizeObserver;
  private scheduler = new RenderScheduler(() => this.render());
  private disposed = false;
  private loadAbort = new AbortController();
  private draco?: DRACOLoader;
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.scheduler.stop();
    this.options.onContextLost();
  };

  private modelBounds?: Box3;
  private meshes: Mesh[] = [];
  private originalMaterials = new Map<Mesh, Material | Material[]>();
  private solidMaterial: MeshStandardMaterial;
  private ghostMaterial: MeshStandardMaterial;
  private materialMode: MaterialMode;
  private grid?: GridHelper;

  private positions = new Map<string, Vector3>();
  private markers = new Map<string, Marker>();
  private markerKeys = new Map<string, string>();
  private segments = new Map<string, { group: Group; material: MeshStandardMaterial }>();
  private segmentKeys = new Map<string, string>();
  private status?: SceneStatus;
  private shapes: Record<MarkerShape, BufferGeometry> = {
    sphere: new SphereGeometry(1, 16, 10),
    octahedron: new OctahedronGeometry(1.35),
    cone: new ConeGeometry(1.05, 2, 12).rotateX(Math.PI),
    box: new BoxGeometry(1.5, 1.5, 1.5)
  };
  private tube = new CylinderGeometry(1, 1, 1, 10, 1);
  private mismatchRing = new RingGeometry(1.5, 1.9, 24);
  private highlightRing: Mesh;
  private highlightId: string | null = null;

  private view: ViewPreset;
  /** The user has orbited since the last preset, so a resize keeps their camera. */
  private orbited = false;
  private lastPoints: ScreenPoint[] = [];

  constructor(
    private options: CarSceneOptions,
    private renderer: WebGLRenderer
  ) {
    const { scene: colours } = options.colours;
    this.view = options.view;
    this.materialMode = options.materialMode;
    this.solidMaterial = new MeshStandardMaterial({ color: colours.body, roughness: 0.75, metalness: 0.1 });
    this.ghostMaterial = new MeshStandardMaterial({
      color: colours.ghost,
      roughness: 0.6,
      transparent: true,
      opacity: GHOST_OPACITY,
      depthWrite: false,
      side: DoubleSide
    });
    this.highlightRing = new Mesh(
      new RingGeometry(1.9, 2.4, 32),
      overlay(new MeshBasicMaterial({ color: colours.highlight, side: DoubleSide }))
    );
  }

  /** Builds the wiring-only scene; split from the constructor so a failure here disposes what was made. */
  init(): void {
    const { canvas, container } = this.options;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(0x000000, 0);

    this.scene.add(new HemisphereLight(0xffffff, 0x303030, 2));
    const sun = new DirectionalLight(0xffffff, 2);
    sun.position.set(3, 4, 2);
    this.scene.add(sun);

    this.placeFromTable();
    this.buildMarkers();
    this.highlightRing.visible = false;
    this.highlightRing.renderOrder = ORDER.ring;
    this.scene.add(this.highlightRing);
    this.rebuildGrid();

    const controls = new OrbitControls(this.camera, canvas);
    this.controls = controls;
    controls.enableDamping = !this.options.reducedMotion;
    controls.maxPolarAngle = 0.48 * Math.PI;
    if (this.options.coarsePointer) {
      // One finger scrolls the page; two rotate and zoom. OrbitControls sets an inline touch-action of none when it
      // connects, which beats any stylesheet, so it is overridden inline here.
      controls.touches = { ONE: null as unknown as TOUCH, TWO: TOUCH.DOLLY_ROTATE };
      canvas.style.touchAction = 'pan-y';
    }
    controls.addEventListener('change', () => this.scheduler.request());
    controls.addEventListener('start', () => (this.orbited = true));

    this.setMaterialMode(this.materialMode);
    this.resize();
    this.setView(this.view);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  async loadModel(url: string | null, onProgress?: (fraction: number | null) => void): Promise<CarModelResult> {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    this.draco = draco;
    const loader = new GLTFLoader().setDRACOLoader(draco);
    try {
      const result = await loadCarModel(
        url,
        (buffer, baseUrl) => loader.parseAsync(buffer, baseUrl),
        { onProgress, signal: this.loadAbort.signal },
        () => draco.dispose()
      );
      if (this.disposed) throw new Error('disposed while loading');
      if (result.kind === 'absent') return result;
      try {
        return this.addModel(result.model.scene, url!.split('/').pop() ?? url!);
      } catch (cause) {
        throw new CarSceneError('model', { cause });
      }
    } finally {
      // Decoding is done (or failed): release the decoder workers.
      draco.dispose();
      this.draco = undefined;
    }
  }

  setStatuses(status: SceneStatus): number {
    this.status = status;
    let changed = 0;
    for (const n of status.nodes) {
      const key = markerKey(n);
      const marker = this.markers.get(n.id);
      if (!marker || this.markerKeys.get(n.id) === key) continue;
      this.styleMarker(marker, n);
      this.markerKeys.set(n.id, key);
      changed++;
    }
    status.segments.forEach((state, i) => {
      const from = status.nodes[i].id;
      const to = status.nodes[i + 1].id;
      const id = `${from}>${to}`;
      const key = segmentKey(state);
      if (this.segmentKeys.get(id) === key || !this.positions.has(from) || !this.positions.has(to)) return;
      this.drawSegment(id, this.positions.get(from)!, this.positions.get(to)!, state);
      this.segmentKeys.set(id, key);
      changed++;
    });
    if (changed) this.scheduler.request();
    return changed;
  }

  setMaterialMode(mode: MaterialMode): void {
    this.materialMode = mode;
    for (const mesh of this.meshes) {
      mesh.material =
        mode === 'original' ? this.originalMaterials.get(mesh)! : mode === 'solid' ? this.solidMaterial : this.ghostMaterial;
    }
    this.scheduler.request();
  }

  setView(preset: ViewPreset): void {
    this.view = preset;
    this.orbited = false;
    const bounds = this.fitBounds();
    const centre = bounds.getCenter(new Vector3());
    // Camera axes for this direction: z towards the camera, x right, y up.
    const z = new Vector3(...VIEW_DIRECTIONS[preset]).normalize();
    const x = new Vector3().crossVectors(Y_AXIS, z).normalize();
    const y = new Vector3().crossVectors(z, x);
    const corners: Vec3[] = [];
    for (const cx of [bounds.min.x, bounds.max.x])
      for (const cy of [bounds.min.y, bounds.max.y])
        for (const cz of [bounds.min.z, bounds.max.z]) {
          const rel = new Vector3(cx, cy, cz).sub(centre);
          corners.push([rel.dot(x), rel.dot(y), rel.dot(z)]);
        }
    const radius = bounds.getSize(new Vector3()).length() / 2;
    // Start from the corner fit (which keeps the box centre in the middle), then re-centre on where the box
    // actually lands on screen and tighten: a box seen from above-front projects lopsided, so the centred fit
    // leaves much of a wide canvas empty.
    const target = centre.clone();
    let distance = fitDistanceToPoints(corners, FOV, this.camera.aspect);
    const tanV = Math.tan((FOV * Math.PI) / 360);
    const tanH = tanV * this.camera.aspect;
    const world = corners.map(([a, b, c]) =>
      centre.clone().addScaledVector(x, a).addScaledVector(y, b).addScaledVector(z, c)
    );
    for (let pass = 0; pass < 3; pass++) {
      this.placeCamera(target, z, distance, radius);
      let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
      for (const p of world) {
        const v = p.clone().project(this.camera);
        [minX, maxX, minY, maxY] = [Math.min(minX, v.x), Math.max(maxX, v.x), Math.min(minY, v.y), Math.max(maxY, v.y)];
      }
      target
        .addScaledVector(x, ((minX + maxX) / 2) * distance * tanH)
        .addScaledVector(y, ((minY + maxY) / 2) * distance * tanV);
      distance *= Math.max((maxX - minX) / 2, (maxY - minY) / 2) * FIT_MARGIN;
    }
    this.placeCamera(target, z, distance, radius);
    const controls = this.controls!;
    controls.target.copy(target);
    // Keep the camera outside the car and the car on screen.
    controls.cursor.copy(centre);
    controls.maxTargetRadius = radius;
    controls.minDistance = Math.min(radius * 0.8, distance * 0.6);
    controls.maxDistance = distance * 2;
    controls.update();
    this.scheduler.request();
  }

  private placeCamera(target: Vector3, towardsCamera: Vector3, distance: number, radius: number): void {
    this.camera.position.copy(target).addScaledVector(towardsCamera, distance);
    this.camera.near = distance / 100;
    this.camera.far = (distance + radius) * 10;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
  }

  setHighlight(id: string | null): void {
    this.highlightId = id;
    for (const [markerId, m] of this.markers) {
      m.mesh.scale.setScalar(MARKER_SIZE * (markerId === id ? HIGHLIGHT_SCALE : 1));
      m.mismatch.scale.setScalar(MARKER_SIZE * (markerId === id ? HIGHLIGHT_SCALE : 1));
    }
    const at = id ? this.positions.get(id) : undefined;
    this.highlightRing.visible = !!at && this.markers.has(id!);
    if (at) {
      this.highlightRing.position.copy(at);
      this.highlightRing.scale.setScalar(MARKER_SIZE * HIGHLIGHT_SCALE);
    }
    this.scheduler.request();
  }

  pick(clientX: number, clientY: number): string | null {
    const rect = this.options.canvas.getBoundingClientRect();
    const points = this.lastPoints.length ? this.lastPoints : this.project();
    return nearestPoint(points, clientX - rect.left, clientY - rect.top, PICK_REACH_PX);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scheduler.stop();
    this.loadAbort.abort(new Error('3D view disposed'));
    this.options.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    const materials = new Set<Material>([this.solidMaterial, this.ghostMaterial]);
    for (const m of this.originalMaterials.values()) (Array.isArray(m) ? m : [m]).forEach((x) => materials.add(x));
    const geometries = new Set<BufferGeometry>([this.tube, this.mismatchRing, ...Object.values(this.shapes)]);
    this.scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof GridHelper) {
        geometries.add(obj.geometry);
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((x: Material) => materials.add(x));
      }
    });
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    }
    geometries.forEach((g) => g.dispose());
    this.draco?.dispose();
    this.renderer.dispose();
    if (!this.renderer.getContext().isContextLost()) this.renderer.forceContextLoss();
  }

  private addModel(root: Object3D, file: string): CarModelResult {
    const ids = new Set(this.options.nodes.map((n) => n.id));
    const prepared = prepareModel(root, ids);
    const warnings = [...prepared.warnings];
    this.modelBounds = prepared.bounds.isEmpty() ? undefined : prepared.bounds;
    this.meshes = prepared.meshes;
    for (const mesh of this.meshes) this.originalMaterials.set(mesh, mesh.material);
    this.scene.add(root);

    // Anchors move their markers; every wire is redrawn at the new positions.
    for (const [id, p] of prepared.anchors) this.positions.get(id)?.set(...p);
    for (const [id, m] of this.markers) m.mesh.position.copy(this.positions.get(id)!);
    for (const [id, m] of this.markers) m.mismatch.position.copy(this.positions.get(id)!);
    this.setHighlight(this.highlightId);
    this.segmentKeys.clear();
    if (this.status) this.setStatuses(this.status);

    if (!prepared.anchors.size && this.modelBounds) {
      const outside = [...this.positions.values()].filter((p) => !this.modelBounds!.containsPoint(p)).length;
      if (outside > this.positions.size / 2) {
        warnings.push(
          `${outside}/${this.positions.size} table positions fall outside the model: check its axes, units and origin (docs/spec/shutdown-loop-page/car-model.md)`
        );
      }
    }
    this.rebuildGrid();
    this.setMaterialMode(this.materialMode);
    if (!this.orbited) this.setView(this.view);
    const summary = modelSummary({
      file,
      total: this.options.nodes.length,
      anchored: this.options.nodes.filter((n) => prepared.anchors.has(n.id)).map((n) => n.id),
      scale: prepared.scale,
      unknownAnchors: prepared.unknownAnchors
    });
    return { kind: 'loaded', summary, warnings };
  }

  private placeFromTable(): void {
    const { positions, missing } = resolveNodePositions(this.options.nodes, NODE_POSITIONS_3D);
    if (missing.length) console.warn('Shutdown 3D view: no position for', missing);
    for (const [id, p] of positions) this.positions.set(id, new Vector3(...p.position));
  }

  private buildMarkers(): void {
    const ringColour = this.options.colours.scene.mismatch;
    for (const [id, position] of this.positions) {
      const material = overlay(new MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.3 }));
      const mesh = new Mesh(this.shapes.sphere, material);
      mesh.position.copy(position);
      mesh.scale.setScalar(MARKER_SIZE);
      mesh.renderOrder = ORDER.marker;
      const mismatch = new Mesh(this.mismatchRing, overlay(new MeshBasicMaterial({ color: ringColour, side: DoubleSide })));
      mismatch.position.copy(position);
      mismatch.scale.setScalar(MARKER_SIZE);
      mismatch.renderOrder = ORDER.ring;
      mismatch.visible = false;
      this.scene.add(mesh, mismatch);
      this.markers.set(id, { mesh, material, mismatch });
    }
  }

  private styleMarker(marker: Marker, n: SceneNode): void {
    const colour = this.options.colours.states[n.state];
    marker.mesh.geometry = this.shapes[MARKER_SHAPES[n.state]];
    marker.material.color.set(colour);
    marker.material.emissive.set(colour);
    marker.material.wireframe = !n.measured;
    marker.mismatch.visible = n.mismatch;
  }

  private drawSegment(id: string, from: Vector3, to: Vector3, state: NodeState): void {
    let entry = this.segments.get(id);
    if (!entry) {
      const material = overlay(new MeshStandardMaterial({ roughness: 0.5, emissiveIntensity: 0.35 }));
      entry = { group: new Group(), material };
      this.scene.add(entry.group);
      this.segments.set(id, entry);
    }
    const colour = this.options.colours.states[state];
    entry.material.color.set(colour);
    entry.material.emissive.set(colour);
    const { radius: r, dash } = segmentStyle(state);
    const a: Vec3 = [from.x, from.y, from.z];
    const b: Vec3 = [to.x, to.y, to.z];
    const pieces = dash ? dashPieces(a, b, dash[0], dash[1]) : [[a, b] as [Vec3, Vec3]];
    entry.group.clear();
    for (const [p, q] of pieces) {
      const start = new Vector3(...p);
      const end = new Vector3(...q);
      const length = start.distanceTo(end);
      if (!length) continue;
      const mesh = new Mesh(this.tube, entry.material);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.copy(new Quaternion().setFromUnitVectors(Y_AXIS, end.clone().sub(start).normalize()));
      mesh.scale.set(r, length, r);
      mesh.renderOrder = ORDER.wire;
      entry.group.add(mesh);
    }
  }

  /** What the camera fits: the model when there is one (markers are expected inside it), else the markers. */
  private fitBounds(): Box3 {
    if (this.modelBounds) return this.modelBounds;
    const bounds = new Box3();
    for (const p of this.positions.values()) bounds.expandByPoint(p);
    return bounds.expandByScalar(0.15);
  }

  private rebuildGrid(): void {
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as Material).dispose();
    }
    const bounds = this.fitBounds();
    const size = bounds.getSize(new Vector3());
    const centre = bounds.getCenter(new Vector3());
    const gridSize = Math.max(2, Math.ceil(Math.max(size.x, size.z) * 1.6));
    const colour = this.options.colours.scene.grid;
    this.grid = new GridHelper(gridSize, gridSize * 4, colour, colour);
    this.grid.position.set(centre.x, this.modelBounds ? this.modelBounds.min.y : 0, centre.z);
    this.scene.add(this.grid);
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.options.container;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    if (dpr !== this.renderer.getPixelRatio()) this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // A preset still in place is re-fitted to the new shape; an orbited camera is left where the user put it.
    if (this.controls && !this.orbited) this.setView(this.view);
    else this.scheduler.request();
  }

  /** Draws one frame; true while orbit damping is still settling. */
  private render(): boolean {
    if (this.disposed) return false;
    const moving = this.controls?.update() ?? false;
    // Rings face the camera.
    this.highlightRing.quaternion.copy(this.camera.quaternion);
    for (const m of this.markers.values()) m.mismatch.quaternion.copy(this.camera.quaternion);
    this.renderer.render(this.scene, this.camera);
    this.lastPoints = this.project();
    this.options.onFrame(this.lastPoints);
    return moving;
  }

  private project(): ScreenPoint[] {
    const { clientWidth: w, clientHeight: h } = this.options.container;
    const v = new Vector3();
    return [...this.markers.keys()].map((id) => {
      v.copy(this.positions.get(id)!).project(this.camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      return { id, x, y, z: v.z, visible: v.z > -1 && v.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
    });
  }
}

/** A material drawn over the car body: no depth test, and in the transparent pass so it comes after the ghost. */
function overlay<T extends Material>(material: T): T {
  material.depthTest = false;
  material.transparent = true;
  return material;
}
