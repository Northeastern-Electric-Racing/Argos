import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { ScreenPoint, ViewPreset } from './car-view-3d.projection';

// The contract between the car-view-3d component and the lazily loaded three.js scene (car-scene.ts). Kept apart
// from car-scene.ts so the component, its tests and the first page load never import three.

/** Colours the scene draws with: CSS colour strings read from theme tokens (see SCENE_COLOR_TOKENS). */
export interface SceneColours {
  frame: string;
  body: string;
  tyre: string;
  rim: string;
  /** Accumulator edges: high voltage, never the cause colour. */
  hv: string;
  edge: string;
  grid: string;
  states: Record<NodeState, string>;
}

export interface CarSceneOptions {
  canvas: HTMLCanvasElement;
  /** Element whose size the canvas follows. */
  container: HTMLElement;
  colours: SceneColours;
  /** prefers-reduced-motion: no damping, and camera moves jump instead of easing. */
  reducedMotion: boolean;
  /** A coarse (touch) pointer: one finger scrolls the page, two orbit and zoom. */
  coarsePointer: boolean;
  /** After every rendered frame, with each placed loop node's marker on screen. */
  onFrame: (points: ScreenPoint[]) => void;
  /** A click (not a drag) with the primary button: the nearest marker's id, or null on empty canvas. */
  onPick: (id: string | null) => void;
  /** The pointer moved onto a marker (its id) or off every marker (null). */
  onHover: (id: string | null) => void;
  /** The WebGL context was lost; the view falls back to 2D. */
  onContextLost: () => void;
}

/** The three.js scene behind the 3D view (car-scene.ts), seen through this interface so three stays lazy. */
export interface CarScene {
  /** Redraws only when a loop node's state or mismatch changed (sceneSignature). */
  setStatuses(nodes: readonly NodeStatus[]): void;
  /** Enlarges the highlighted loop node's marker; null for none. */
  setHighlight(id: string | null): void;
  /** Moves the orbit target to a loop node and closes in on it; null leaves the camera where it is. */
  focus(id: string | null): void;
  setView(preset: ViewPreset): void;
  /** Whether pointer picks and hovers are reported. */
  setInteractive(interactive: boolean): void;
  dispose(): void;
}
export type CarSceneFactory = (options: CarSceneOptions) => CarScene;
