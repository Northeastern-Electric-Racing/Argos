import { DOCUMENT, inject, InjectionToken } from '@angular/core';
import type { CarSceneModule } from './car-scene.types';

/** Loads the three.js scene module on demand, so three is a lazy chunk. Overridden in tests. */
export const CAR_SCENE_LOADER = new InjectionToken<() => Promise<CarSceneModule>>('CAR_SCENE_LOADER', {
  providedIn: 'root',
  factory: () => () => import('./car-scene')
});

/** Whether this browser can make a WebGL context; probed once per page load. Overridden in tests (jsdom has none). */
export const WEBGL_SUPPORT = new InjectionToken<() => boolean>('WEBGL_SUPPORT', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT);
    let supported: boolean | undefined;
    return () => (supported ??= isWebGLAvailable(doc));
  }
});

/**
 * Where the car model (GLB) is served from, or null when there is none: the view then draws the loop wiring
 * alone. The file is fetched with revalidation, so saving over it shows the new model on the next load.
 */
export const CAR_MODEL_URL = new InjectionToken<string | null>('CAR_MODEL_URL', {
  providedIn: 'root',
  factory: () => 'assets/models/car.glb'
});

/** Makes a throwaway WebGL context to see whether one can be made, and releases it straight away. */
export function isWebGLAvailable(doc: Pick<Document, 'createElement'>): boolean {
  try {
    const canvas = doc.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
