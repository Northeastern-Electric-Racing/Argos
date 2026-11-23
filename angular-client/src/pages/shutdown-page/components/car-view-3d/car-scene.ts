import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Sphere,
  SphereGeometry,
  Texture,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { NODE_POSITIONS_3D } from '../../shutdown-loop.positions-3d';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarScene, CarSceneOptions, ScreenPoint } from './car-scene.types';
import {
  CarSceneError,
  fitDistance,
  loopSegments,
  MarkerShape,
  markerStyle,
  MaterialMode,
  nearestPoint,
  NodeAnchor,
  parseNodeAnchorName,
  PositionSource,
  resolveNodePositions,
  ResolvedPositions,
  SegmentEmphasis,
  StateColours,
  unitScaleFor,
  VIEW_DIRECTIONS,
  ViewPreset
} from './car-view-3d.utils';

// The three.js half of the 3D car view. Only ever loaded with a dynamic import, so three stays out of
// the page's initial bundle.

const MAX_PIXEL_RATIO = 2;
const FOV = 40;
/** Marker size in metres (model space). */
const MARKER_SIZE = 0.035;
const SELECTED_SCALE = 1.7;
const TUBE_RADIUS: Record<SegmentEmphasis, number> = { strong: 0.016, normal: 0.01, muted: 0.005 };
const PICK_REACH_PX = 18;
const GHOST_OPACITY = 0.18;
const Y_AXIS = new Vector3(0, 1, 0);

interface Marker {
  mesh: Mesh;
  material: MeshStandardMaterial;
  position: Vector3;
}

export async function createCarScene(options: CarSceneOptions): Promise<CarScene> {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (cause) {
    throw new CarSceneError('webgl', { cause });
  }

  const draco = new DRACOLoader().setDecoderPath(options.dracoDecoderPath);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync(options.modelUrl);
    return new ThreeCarScene(options, renderer, draco, gltf.scene);
  } catch (cause) {
    draco.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw new CarSceneError('model', { cause });
  }
}

class ThreeCarScene implements CarScene {
  readonly positionSources: ReadonlyMap<string, PositionSource>;

  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 0.01, 100);
  private controls: OrbitControls;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private disposed = false;

  private meshes: Mesh[] = [];
  private cadMaterials = new Map<Mesh, Material | Material[]>();
  private themeMaterial: MeshStandardMaterial;
  private ghostMaterial: MeshStandardMaterial;

  private positions: ResolvedPositions['positions'];
  private markers = new Map<string, Marker>();
  private segments = new Map<string, { mesh: Mesh; material: MeshStandardMaterial }>();
  private shapes: Record<MarkerShape, BufferGeometry>;
  private segmentGeometry = new CylinderGeometry(1, 1, 1, 10, 1);
  private bounds = new Sphere();
  private selected: string | null = null;
  private selectionColour: Color;

  constructor(
    private options: CarSceneOptions,
    private renderer: WebGLRenderer,
    private draco: DRACOLoader,
    model: Object3D
  ) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);

    const { theme } = options;
    this.selectionColour = new Color(theme.selection);
    this.themeMaterial = new MeshStandardMaterial({ color: theme.body, roughness: 0.75, metalness: 0.1 });
    this.ghostMaterial = new MeshStandardMaterial({
      color: theme.ghost,
      roughness: 0.6,
      transparent: true,
      opacity: GHOST_OPACITY,
      depthWrite: false,
      side: DoubleSide
    });

    // Bring the model to metres (CAD often exports millimetres) before reading anchors or bounds.
    const rawSize = new Box3().setFromObject(model).getSize(new Vector3());
    model.scale.multiplyScalar(unitScaleFor(Math.max(rawSize.x, rawSize.y, rawSize.z)));
    model.updateMatrixWorld(true);

    const anchors: NodeAnchor[] = [];
    model.traverse((obj) => {
      // GLTFLoader strips ':' from names; the name as authored is kept in userData.name.
      const name = String(obj.userData['name'] ?? obj.name);
      if (parseNodeAnchorName(name) !== undefined) {
        const p = obj.getWorldPosition(new Vector3());
        anchors.push({ name, position: [p.x, p.y, p.z] });
        // An anchor only marks a place; if it was exported as a small mesh, don't draw it.
        if (obj instanceof Mesh) obj.visible = false;
      } else if (obj instanceof Mesh) {
        this.meshes.push(obj);
        this.cadMaterials.set(obj, obj.material);
      }
    });
    const resolved = resolveNodePositions(options.nodes, NODE_POSITIONS_3D, anchors);
    if (resolved.missing.length) console.warn('Shutdown 3D view: no position for', resolved.missing);
    if (resolved.unknownAnchors.length) console.warn('Shutdown 3D view: unknown node anchors', resolved.unknownAnchors);
    this.positions = resolved.positions;
    this.positionSources = new Map([...resolved.positions].map(([id, p]) => [id, p.source]));

    this.shapes = {
      sphere: new SphereGeometry(1, 16, 10),
      octahedron: new OctahedronGeometry(1.35),
      cone: new ConeGeometry(1.05, 2, 12).rotateX(Math.PI),
      box: new BoxGeometry(1.5, 1.5, 1.5)
    };

    this.scene.add(model);
    this.scene.add(new HemisphereLight(0xffffff, 0x303030, 2));
    const sun = new DirectionalLight(0xffffff, 2);
    sun.position.set(2, 4, -3);
    this.scene.add(sun);
    this.buildMarkers();

    const box = new Box3().setFromObject(model);
    for (const m of this.markers.values()) box.expandByPoint(m.position);
    box.getBoundingSphere(this.bounds);
    const grid = new GridHelper(
      Math.ceil(this.bounds.radius * 3),
      Math.ceil(this.bounds.radius * 6),
      theme.grid,
      theme.grid
    );
    grid.position.set(this.bounds.center.x, 0, this.bounds.center.z);
    this.scene.add(grid);

    this.controls = new OrbitControls(this.camera, options.canvas);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => this.requestRender());

    this.setMaterialMode(options.materialMode);
    this.resize();
    this.setView(options.view);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(options.container);
  }

  setStatuses(statuses: readonly NodeStatus[], colours: StateColours): void {
    for (const s of statuses) {
      const marker = this.markers.get(s.node.id);
      if (!marker) continue;
      const style = markerStyle(s, colours);
      marker.mesh.geometry = this.shapes[style.shape];
      marker.material.color.set(style.colour);
      marker.material.emissive.set(style.colour);
      marker.material.wireframe = style.hollow;
    }
    for (const seg of loopSegments(statuses, this.positions, colours)) {
      let entry = this.segments.get(seg.key);
      if (!entry) {
        const material = new MeshStandardMaterial({ roughness: 0.5, emissiveIntensity: 0.35 });
        const mesh = new Mesh(this.segmentGeometry, material);
        const from = new Vector3(...seg.from);
        const to = new Vector3(...seg.to);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.copy(new Quaternion().setFromUnitVectors(Y_AXIS, to.clone().sub(from).normalize()));
        mesh.userData['length'] = from.distanceTo(to);
        this.scene.add(mesh);
        entry = { mesh, material };
        this.segments.set(seg.key, entry);
      }
      const r = TUBE_RADIUS[seg.emphasis];
      entry.mesh.scale.set(r, entry.mesh.userData['length'], r);
      entry.material.color.set(seg.colour);
      entry.material.emissive.set(seg.colour);
    }
    this.applySelection();
    this.requestRender();
  }

  setMaterialMode(mode: MaterialMode): void {
    for (const mesh of this.meshes) {
      mesh.material =
        mode === 'cad' ? this.cadMaterials.get(mesh)! : mode === 'theme' ? this.themeMaterial : this.ghostMaterial;
    }
    this.requestRender();
  }

  setView(preset: ViewPreset): void {
    const { center, radius } = this.bounds;
    const distance = fitDistance(radius, FOV, this.camera.aspect);
    const dir = new Vector3(...VIEW_DIRECTIONS[preset]).normalize();
    this.camera.position.copy(center).addScaledVector(dir, distance);
    this.camera.near = distance / 100;
    this.camera.far = distance * 20;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.minDistance = radius * 0.3;
    this.controls.maxDistance = distance * 4;
    this.controls.update();
    this.requestRender();
  }

  setSelected(id: string | null): void {
    this.selected = id;
    this.applySelection();
    this.requestRender();
  }

  pick(clientX: number, clientY: number): string | null {
    const rect = this.options.canvas.getBoundingClientRect();
    return nearestPoint(this.project(), clientX - rect.left, clientY - rect.top, PICK_REACH_PX);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const materials = new Set<Material>([this.themeMaterial, this.ghostMaterial]);
    for (const m of this.cadMaterials.values()) (Array.isArray(m) ? m : [m]).forEach((x) => materials.add(x));
    const geometries = new Set<BufferGeometry>([this.segmentGeometry, ...Object.values(this.shapes)]);
    this.scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        geometries.add(obj.geometry);
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((x: Material) => materials.add(x));
      } else if (obj instanceof GridHelper) {
        geometries.add(obj.geometry);
        materials.add(obj.material as Material);
      }
    });
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    }
    geometries.forEach((g) => g.dispose());
    this.draco.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private buildMarkers(): void {
    for (const node of this.options.nodes) {
      const placed = this.positions.get(node.id);
      if (!placed) continue;
      const material = new MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.3 });
      const mesh = new Mesh(this.shapes.sphere, material);
      const position = new Vector3(...placed.position);
      mesh.position.copy(position);
      mesh.scale.setScalar(MARKER_SIZE);
      // Draw markers over the wiring tubes that end inside them.
      mesh.renderOrder = 1;
      this.scene.add(mesh);
      this.markers.set(node.id, { mesh, material, position });
    }
  }

  private applySelection(): void {
    for (const [id, m] of this.markers) {
      const on = id === this.selected;
      m.mesh.scale.setScalar(MARKER_SIZE * (on ? SELECTED_SCALE : 1));
      m.material.emissive.copy(on ? this.selectionColour : m.material.color);
      m.material.emissiveIntensity = on ? 0.6 : 0.3;
    }
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.options.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private requestRender(): void {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.disposed) return;
      // With damping on, update() keeps reporting movement until the orbit settles.
      const moving = this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.options.onFrame(this.project());
      if (moving) this.requestRender();
    });
  }

  private project(): ScreenPoint[] {
    const { clientWidth: w, clientHeight: h } = this.options.container;
    const v = new Vector3();
    return [...this.markers].map(([id, m]) => {
      v.copy(m.position).project(this.camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      return { id, x, y, visible: v.z > -1 && v.z < 1 && x >= 0 && x <= w && y >= 0 && y <= h };
    });
  }
}
