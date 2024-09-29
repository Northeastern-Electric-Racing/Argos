import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import ChargingPage from 'src/pages/charging-page/charging-page.component';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import LandingPage from 'src/pages/landing-page/landing-page.component';
import Map from 'src/pages/map/map.component';

const routes: Routes = [
  { path: 'landing', component: LandingPage },
  { path: 'graph', component: GraphPage },
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'map', component: Map },
  { path: 'charging', component: ChargingPage }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    CommonModule,
    BrowserAnimationsModule // required animations module
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
