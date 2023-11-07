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
import LandingPage from 'src/components/landing-page/landing-page.component';
import MoreDetails from 'src/components/more-details/more-details.component';
import { HistoryButton } from 'src/components/history/history.component';
import { CarouselRun } from 'src/components/carousel/carousel.component';

@NgModule({
  declarations: [LandingPage, MoreDetails, HistoryButton, CarouselRun],
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
  bootstrap: [LandingPage]
})
export class AppModule {}
