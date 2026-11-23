import { InjectionToken } from '@angular/core';
import { CarSceneFactory, isWebGLAvailable } from './car-view-3d.model';

/** Loads the three.js scene on demand, so three.js is a lazy chunk and never in the initial bundle. */
export const CAR_SCENE_LOADER = new InjectionToken<() => Promise<CarSceneFactory>>('CAR_SCENE_LOADER', {
  providedIn: 'root',
  factory: () => () => import('./car-scene').then((m) => m.createCarScene)
});

/** Whether this browser can draw the 3D view; when it can't, the 2D car view is shown instead. */
export const WEBGL_SUPPORT = new InjectionToken<() => boolean>('WEBGL_SUPPORT', {
  providedIn: 'root',
  factory: () => () => isWebGLAvailable()
});
