/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EnvService {
  backendUrl = (window as any).__env.BACKEND_URL;
  mapboxToken = (window as any).__env.MAP_ACCESS_TOKEN;
}
