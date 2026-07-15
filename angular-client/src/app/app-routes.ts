import { Segment } from 'src/utils/bms.utils';

// Route-path builders live here, separate from AppRoutingModule, so that components can import
// `appRoutes` without pulling in the NgModule (which imports every page component). That import
// direction created component <-> app-routing.module cycles that threw module-load TDZ errors.

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
const rulesRoute = () => `/rules`;
const efusesRoute = () => `/efuses`;
const notificationLogRoute = () => `/notification-log`;
const lapTimerRoute = () => `/lap-timer`;

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
  rulesRoute,
  efusesRoute,
  notificationLogRoute,
  lapTimerRoute
};
