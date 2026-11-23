import { DOCUMENT, inject, InjectionToken } from '@angular/core';
import { CarSceneFactory } from './car-scene.types';
import { isWebGLAvailable } from './car-view-3d.utils';

/** Loads the three.js scene on demand, so three.js is a lazy chunk and never in the initial bundle. */
export const CAR_SCENE_LOADER = new InjectionToken<() => Promise<CarSceneFactory>>('CAR_SCENE_LOADER', {
  providedIn: 'root',
  factory: () => () => import('./car-scene').then((m) => m.createCarScene)
});

/**
 * Whether this browser can draw the 3D view; when it can't, the page shows the 2D car view. Probed once per page
 * load (the probe context is released), however often the 3D view is mounted.
 */
export const WEBGL_SUPPORT = new InjectionToken<() => boolean>('WEBGL_SUPPORT', {
  providedIn: 'root',
  factory: () => {
    const doc = inject(DOCUMENT);
    let supported: boolean | undefined;
    return () => (supported ??= isWebGLAvailable(doc));
  }
});
