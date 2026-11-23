import { LoopNode } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { MaterialMode, PositionSource, StateColours, ViewPreset } from './car-view-3d.utils';

// The contract between the car-view-3d component and the lazily loaded three.js scene (car-scene.ts).
// Kept apart from car-scene.ts so the component (and its tests) never import three.

/** A node's marker projected onto the canvas, in CSS pixels from its top-left corner. */
export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
  /** False when the point is behind the camera or off the canvas. */
  visible: boolean;
}

export interface CarSceneOptions {
  /** Sized element the canvas fills; watched for resizes. */
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  nodes: readonly LoopNode[];
  modelUrl: string;
  /** Folder holding the Draco decoder (draco_decoder.wasm etc.), served from our own assets. */
  dracoDecoderPath: string;
  view: ViewPreset;
  materialMode: MaterialMode;
  /** Theme colours (CSS colour strings) for the theme / ghost materials and the ground grid. */
  theme: { body: string; ghost: string; grid: string; selection: string };
  /** Called after every rendered frame with each placed node's screen position. */
  onFrame: (points: ScreenPoint[]) => void;
}

export interface CarScene {
  /** Where each placed node's position came from: a named empty in the model or the table. */
  readonly positionSources: ReadonlyMap<string, PositionSource>;
  setStatuses(statuses: readonly NodeStatus[], colours: StateColours): void;
  setMaterialMode(mode: MaterialMode): void;
  setView(preset: ViewPreset): void;
  setSelected(id: string | null): void;
  /** The node whose marker is nearest a click (client coordinates), within a few pixels, or null. */
  pick(clientX: number, clientY: number): string | null;
  dispose(): void;
}

export interface CarSceneModule {
  createCarScene(options: CarSceneOptions): Promise<CarScene>;
}
