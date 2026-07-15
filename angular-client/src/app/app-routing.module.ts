import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BmsDebugPageComponent } from 'src/pages/bms-debug-page/bms-debug-page.component';
import { BmsSegmentViewComponent } from 'src/pages/bms-debug-page/bms-segment-view/bms-segment-view.component';
import { CameraPageComponent } from 'src/pages/camera-page/camera-page.component';
import CarCommandComponent from 'src/pages/car-command-page/car-command.component';
import ChargingPageComponent from 'src/pages/charging-page/charging-page.component';
import EfusesPageComponent from 'src/pages/efuses-page/efuses-page.component';
import NotificationLogPageComponent from 'src/pages/notification-log-page/notification-log-page.component';
import FaultPageComponent from 'src/pages/fault-page/fault-page.component';
import GraphPageComponent from 'src/pages/graph-page/graph-page.component';
import LandingPageComponent from 'src/pages/landing-page/landing-page.component';
import LapTimerPageComponent from 'src/pages/lap-timer-page/lap-timer-page.component';
import MapComponent from 'src/pages/map/map.component';
import NotificationRulesPageComponent from 'src/pages/notification-rules-page/notification-rules-page.component';
import { appRoutes } from './app-routes';

// Routes should be defined carefully in accordance with the appRoutes
const routes: Routes = [
  { path: 'landing', component: LandingPageComponent },
  { path: 'graph', component: GraphPageComponent },
  { path: '', redirectTo: appRoutes.landingRoute(), pathMatch: 'full' },
  { path: 'map', component: MapComponent },
  { path: 'charging', component: ChargingPageComponent },
  { path: 'bms', component: BmsDebugPageComponent },
  // NOTE: paramaterized routes should be even more carefully defined in accordance with the appRoutes
  { path: 'bms/segment/:id', component: BmsSegmentViewComponent },
  { path: 'faults', component: FaultPageComponent },
  { path: 'faults/fault-graph', component: GraphPageComponent },
  { path: 'camera', component: CameraPageComponent },
  { path: 'commands', component: CarCommandComponent },
  { path: 'rules', component: NotificationRulesPageComponent },
  { path: 'efuses', component: EfusesPageComponent },
  { path: 'notification-log', component: NotificationLogPageComponent },
  { path: 'lap-timer', component: LapTimerPageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
