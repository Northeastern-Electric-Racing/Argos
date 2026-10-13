import { Routes } from '@angular/router';
import { appRoutes } from './app-routes';

// Lazy-loaded routes: each page is split into its own chunk to reduce initial bundle size (#199).
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
    loadComponent: () => import('src/pages/bms-debug-page/bms-debug-page.component').then((m) => m.BmsDebugPageComponent)
  },
  {
    path: 'bms/segment/:id',
    loadComponent: () =>
      import('src/pages/bms-debug-page/bms-segment-view/bms-segment-view.component').then((m) => m.BmsSegmentViewComponent)
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
    loadComponent: () => import('src/pages/camera-page/camera-page.component').then((m) => m.CameraPageComponent)
  },
  {
    path: 'commands',
    loadComponent: () => import('src/pages/car-command-page/car-command.component')
  },
  {
    path: 'rules',
    loadComponent: () => import('src/pages/notification-rules-page/notification-rules-page.component')
  },
  {
    path: 'efuses',
    loadComponent: () => import('src/pages/efuses-page/efuses-page.component')
  },
  {
    path: 'notification-log',
    loadComponent: () => import('src/pages/notification-log-page/notification-log-page.component')
  },
  {
    path: 'lap-timer',
    loadComponent: () => import('src/pages/lap-timer-page/lap-timer-page.component')
  }
];
