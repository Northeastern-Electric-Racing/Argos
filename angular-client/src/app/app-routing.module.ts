import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import LandingPage from 'src/pages/landing-page/landing-page.component';

const routes: Routes = [
  { path: 'landing', component: LandingPage },
  { path: 'graph/:realTime/:runId', component: GraphPage },
  { path: '', redirectTo: '/landing', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
