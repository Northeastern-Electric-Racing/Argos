import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import CharybdisPage from 'src/pages/charybdis-page/charybdis-page.component';
import FaultPage from 'src/pages/fault-page/fault-page.component';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import LandingPage from 'src/pages/landing-page/landing-page.component';
import Map from 'src/pages/map/map.component';

const routes: Routes = [
  { path: 'landing', component: LandingPage },
  { path: 'graph', component: GraphPage },
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'map', component: Map },
  { path: 'charybdis', component: CharybdisPage },
  { path: 'fault', component: FaultPage }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
