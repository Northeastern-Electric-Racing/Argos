import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BmsDebugPageComponent } from 'src/pages/bms-debug-page/bms-debug-page.component';
import { BmsSegmentViewComponent } from 'src/pages/bms-debug-page/bms-segment-view/bms-segment-view.component';
import { CameraPageComponent } from 'src/pages/camera-page/camera-page.component';
import ChargingPageComponent from 'src/pages/charging-page/charging-page.component';
import GraphPageComponent from 'src/pages/graph-page/graph-page.component';
import LandingPageComponent from 'src/pages/landing-page/landing-page.component';
import MapComponent from 'src/pages/map/map.component';

const routes: Routes = [
  { path: 'landing', component: LandingPageComponent },
  { path: 'graph', component: GraphPageComponent },
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'map', component: MapComponent },
  { path: 'charging', component: ChargingPageComponent },
  { path: 'bms', component: BmsDebugPageComponent },
  { path: 'bms/segment/:id', component: BmsSegmentViewComponent },
  { path: 'camera', component: CameraPageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
