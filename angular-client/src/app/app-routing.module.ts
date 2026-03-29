import { Routes } from '@angular/router';
import { Segment } from 'src/utils/bms.utils';

const landingRoute = () => `/landing`;
const graphRoute = () => `/graph`;
const mapRoute = () => `/map`;
const chargingRoute = () => `/charging`;
const bmsRoute = () => `/bms`;
const bmsSegmentViewRoute = (id: Segment) => `/bms/segment/${id + 1}`;
const cameraRoute = () => `/camera`;
const faultsRoute = () => `/faults`;
const faultsGraphRoute = () => `/faults/fault-graph`;
const commandsRoute = () => `/commands`;
const efusesRoute = () => `/efuses`;

export const appRoutes = {
  landingRoute,
  graphRoute,
  mapRoute,
  chargingRoute,
  bmsRoute,
  bmsSegmentViewRoute,
  cameraRoute,
  faultsRoute,
  faultsGraphRoute,
  commandsRoute,
  efusesRoute
};

// Routes use loadComponent for lazy loading / route-level code splitting.
// Each page is loaded on demand rather than bundled into the initial chunk.
export const routes: Routes = [
  {
    path: 'landing',
    loadComponent: () => import('src/pages/landing-page/landing-page.component')
  },
  {
    path: 'graph',
    loadComponent: () => import('src/pages/graph-page/graph-page.component')
  },
  { path: '', redirectTo: appRoutes.landingRoute(), pathMatch: 'full' },
  {
    path: 'map',
    loadComponent: () => import('src/pages/map/map.component')
  },
  {
    path: 'charging',
    loadComponent: () => import('src/pages/charging-page/charging-page.component')
  },
  {
    path: 'bms',
    loadComponent: () =>
      import('src/pages/bms-debug-page/bms-debug-page.component').then((m) => m.BmsDebugPageComponent)
  },
  {
    path: 'bms/segment/:id',
    loadComponent: () =>
      import('src/pages/bms-debug-page/bms-segment-view/bms-segment-view.component').then(
        (m) => m.BmsSegmentViewComponent
      )
  },
  {
    path: 'faults',
    loadComponent: () => import('src/pages/fault-page/fault-page.component')
  },
  {
    path: 'faults/fault-graph',
    loadComponent: () => import('src/pages/graph-page/graph-page.component')
  },
  {
    path: 'camera',
    loadComponent: () =>
      import('src/pages/camera-page/camera-page.component').then((m) => m.CameraPageComponent)
  },
  {
    path: 'commands',
    loadComponent: () => import('src/pages/car-command-page/car-command.component')
  },
  {
    path: 'efuses',
    loadComponent: () => import('src/pages/efuses-page/efuses-page.component')
  }
];
