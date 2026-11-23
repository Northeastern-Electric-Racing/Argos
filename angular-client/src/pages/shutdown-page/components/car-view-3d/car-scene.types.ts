import { LoopNode } from '../../shutdown-loop.model';
import { ScreenPoint, ViewPreset } from './car-view-3d.projection';
import { MaterialMode, SceneColours, SceneStatus, StateColours } from './car-view-3d.utils';

// The contract between the car-view-3d component and the lazily loaded three.js scene (car-scene.ts).
// Kept apart from car-scene.ts so the component (and its tests) never import three.

export type { ScreenPoint };

export interface CarSceneOptions {
  /** Sized element the canvas fills; watched for resizes. */
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  nodes: readonly LoopNode[];
  view: ViewPreset;
  materialMode: MaterialMode;
  /** Theme colours (CSS colour strings): readStateColours for the states, SCENE_COLOR_TOKENS for the rest. */
  colours: { states: StateColours; scene: SceneColours };
  /** prefers-reduced-motion: no orbit damping. */
  reducedMotion: boolean;
  /** A coarse (touch) pointer: one finger scrolls the page, two fingers orbit and zoom. */
  coarsePointer: boolean;
  /** Called after every rendered frame with each placed loop node's screen position. */
  onFrame: (points: ScreenPoint[]) => void;
  /** The browser took the WebGL context away (sleep, GPU reset); the view should dispose and fall back. */
  onContextLost: () => void;
}

/** What loading the car model found: no model (the wiring is drawn alone), or a model with its summary line. */
export type CarModelResult = { kind: 'absent'; reason: string } | { kind: 'loaded'; summary: string; warnings: string[] };

export interface CarScene {
  /**
   * Loads the car model into the scene, which until then draws the loop wiring alone. Resolves absent when there is
   * no model; rejects with CarSceneError('model') when one is present but broken or too slow.
   */
  loadModel(url: string | null, onProgress?: (fraction: number | null) => void): Promise<CarModelResult>;
  /** Redraws only the markers and wires whose look changed; returns how many changed. */
  setStatuses(status: SceneStatus): number;
  setMaterialMode(mode: MaterialMode): void;
  setView(preset: ViewPreset): void;
  /** previewId ?? selectedId: scaled up and ringed, keeping its state colour. */
  setHighlight(id: string | null): void;
  /** The loop node whose marker is nearest a pointer position (client coordinates), within a few pixels, or null. */
  pick(clientX: number, clientY: number): string | null;
  dispose(): void;
}

/** Builds the scene; rejects with CarSceneError ('webgl' or 'init'). What CAR_SCENE_LOADER resolves to. */
export type CarSceneFactory = (options: CarSceneOptions) => Promise<CarScene>;
