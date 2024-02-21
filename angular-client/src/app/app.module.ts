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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CarouselModule } from 'primeng/carousel';
import LandingPage from 'src/pages/landing-page/landing-page.component';
import GraphSidebar from 'src/pages/graph-page/graph-sidebar/graph-sidebar.component';
import SidebarCard from 'src/components/sidebar-card/sidebar-card.component';
import AppContext from './context/app-context.component';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import Typography from 'src/components/typography/typography.component';
import LoadingPage from 'src/components/loading-page/loading-page.component';
import ErrorPage from 'src/components/error-page/error-page.component';
import Header from 'src/components/header/header.component';
import LandingHeader from 'src/pages/landing-page/landing-header/landing-header';
import GraphHeader from 'src/pages/graph-page/graph-header/graph-header.component';
import { BatteryPercentageComponent } from 'src/components/battery/battery.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import MoreDetails from 'src/components/more-details/more-details.component';
import { History } from 'src/components/history-button/history.component';
import { Carousel } from 'src/components/carousel/carousel.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import GraphInfo from 'src/pages/graph-page/graph-caption/graph-caption.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import Graph from 'src/pages/graph-page/graph/graph.component';
import LandingButtons from 'src/pages/landing-page/landing-buttons/landing-buttons.component';
import GraphSidebarMobile from 'src/pages/graph-page/graph-sidebar/graph-sidebar-mobile/graph-sidebar-mobile.component';
import GraphSidebarDesktop from 'src/pages/graph-page/graph-sidebar/graph-sidebar-desktop/graph-sidebar-desktop.component';
import Map from 'src/pages/map/map.component';
import Thermometer from 'src/components/thermometer/thermometer.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import HStack from 'src/components/hstack/hstack.component';
import VStack from 'src/components/vstack/vstack.component';

@NgModule({
  declarations: [
    AppContext,
    LandingPage,
    GraphPage,
    GraphSidebar,
    GraphSidebarMobile,
    GraphSidebarDesktop,
    SidebarCard,
    Typography,
    LoadingPage,
    ErrorPage,
    Header,
    LandingHeader,
    GraphHeader,
    BatteryPercentageComponent,
    MoreDetails,
    History,
    Carousel,
    ButtonComponent,
    GraphInfo,
    Graph,
    LandingButtons,
    Map,
    InfoBackgroundComponent,
    Thermometer,
    VStack,
    HStack
  ],
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
    CarouselModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
    FlexLayoutModule
  ],
  providers: [],
  bootstrap: [AppContext]
})
export class AppModule {}
