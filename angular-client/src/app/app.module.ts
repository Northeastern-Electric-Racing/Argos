import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { CarouselModule } from 'primeng/carousel';
import LandingPage from 'src/pages/landing-page/landing-page.component';
import Sidebar from 'src/pages/graph-page/sidebar/sidebar.component';
import SidebarCard from 'src/components/sidebar-card/sidebar-card.component';
import AppContext from './context/app-context.component';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import Typography from 'src/components/typography/typography.component';
import LoadingPage from 'src/components/loading-page/loading-page.component';
import ErrorPage from 'src/components/error-page/error-page.component';
import Header from 'src/components/header/header.component';
import LandingHeader from 'src/pages/landing-page/landing-header/landing-header';
import GraphHeader from 'src/pages/graph-page/graph-header/graph-header.component';
import MoreDetails from 'src/components/more-details/more-details.component';
import { HistoryButton } from 'src/components/history/history.component';
import { CarouselRun } from 'src/components/carousel/carousel.component';

@NgModule({
  declarations: [LandingPage],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatGridListModule,
    MatCardModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatDialogModule,
    CarouselModule
  ],
  providers: [],
  bootstrap: [AppContext]
})
export class AppModule {}
