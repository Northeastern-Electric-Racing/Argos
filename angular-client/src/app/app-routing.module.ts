import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BmsDebugPageComponent } from 'src/pages/bms-debug-page/bms-debug-page.component';
import ChargingPageComponent from 'src/pages/charging-page/charging-page.component';
import FaultGraphComponent from 'src/pages/fault-page/fault-graph/fault-graph.component';
import FaultPageComponent from 'src/pages/fault-page/fault-page.component';
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
  { path: 'faults', component: FaultPageComponent },
  { path: 'fault-graph', component: FaultGraphComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
