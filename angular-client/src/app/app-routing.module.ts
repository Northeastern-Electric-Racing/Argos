import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import HandlingPage from 'src/pages/handling/handling-page.component';
import LandingPage from 'src/pages/landing-page/landing-page.component';
import Map from 'src/pages/map/map.component';

const routes: Routes = [
  { path: 'landing', component: LandingPage },
  { path: 'graph', component: GraphPage },
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'map', component: Map },
  { path: 'handling', component: HandlingPage }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
