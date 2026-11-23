import { InjectionToken } from '@angular/core';

/**
 * Where the car model (GLB) is served from, or null when there is none: the view then draws the loop wiring
 * alone. The file is fetched with revalidation, so saving over it shows the new model on the next load.
 */
export const CAR_MODEL_URL = new InjectionToken<string | null>('CAR_MODEL_URL', {
  providedIn: 'root',
  factory: () => 'assets/models/car.glb'
});
