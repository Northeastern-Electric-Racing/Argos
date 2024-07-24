import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { CarouselModule } from 'primeng/carousel';
import { ToastModule } from 'primeng/toast';
import { OrderListModule } from 'primeng/orderlist';
import LandingPage from 'src/pages/landing-page/landing-page.component';
import ChargingPage from 'src/pages/charging-page/charging-page.component';
import ChargingPageMobile from 'src/pages/charging-page/charging-page-mobile/charging-page-mobile.component';
import GraphSidebar from 'src/pages/graph-page/graph-sidebar/graph-sidebar.component';
import SidebarCard from 'src/components/sidebar-card/sidebar-card.component';
import AppContext from './context/app-context.component';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import Typography from 'src/components/typography/typography.component';
import LoadingPage from 'src/components/loading-page/loading-page.component';
import ErrorPage from 'src/components/error-page/error-page.component';
import Header from 'src/components/header/header.component';
import GraphHeader from 'src/pages/graph-page/graph-header/graph-header.component';
import { BatteryPercentageComponent } from 'src/components/battery-components/battery-percentage/battery-percentage.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import { CircularPercentageComponent } from 'src/components/circular-percentage/circular-percentage.component';
import MoreDetails from 'src/components/more-details/more-details.component';
import { RunSelector } from 'src/components/run-selector/run-selector.component';
import { Carousel } from 'src/components/carousel/carousel.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import GraphInfo from 'src/pages/graph-page/graph-caption/graph-caption.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import Graph from 'src/pages/graph-page/graph/graph.component';
import GraphSidebarMobile from 'src/pages/graph-page/graph-sidebar/graph-sidebar-mobile/graph-sidebar-mobile.component';
import GraphSidebarDesktop from 'src/pages/graph-page/graph-sidebar/graph-sidebar-desktop/graph-sidebar-desktop.component';
import Map from 'src/pages/map/map.component';
import Thermometer from 'src/components/thermometer/thermometer.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import HStack from 'src/components/hstack/hstack.component';
import VStack from 'src/components/vstack/vstack.component';
import ResolutionSelector from 'src/components/resolution-selector/resolution-selector.component';
import LatencyDisplay from 'src/components/latency-display/latency-display';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { BatteryInfoDisplay } from 'src/components/battery-components/battery-info-display/battery-info-display';
import { GraphComponent } from 'src/components/graph/graph.component';
import { InfoGraph } from 'src/components/info-graph/info-graph.component';
import { GraphDialog } from 'src/components/graph-dialog/graph-dialog.component';
import { SteeringAngleDisplay } from 'src/components/steering-angle-display/steering-angle-display.component';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import HalfGauge from 'src/components/half-gauge/half-gauge.component';
import { Divider } from 'src/components/divider/divider';
import { DriverComponent } from 'src/components/driver-component/driver-component';
import PieChart from 'src/components/pie-chart/pie-chart.component';
import RasberryPi from 'src/components/raspberry-pi/raspberry-pi.component';
import { AccelerationGraphs } from 'src/components/acceleration-graphs/acceleration-graphs.component';
import ViewerDisplay from 'src/components/viewer-display/viewer-display.component';
import ConnectionDisplay from 'src/components/connection-display/connection-display.component';
import SpeedDisplay from 'src/components/speed-display/speed-display.component';
import SpeedOverTimeDisplay from 'src/components/speed-over-time-display/speed-over-time-display.component';
import TorqueDisplay from 'src/components/torque-display/torque-display.component';
import TransmissionDisplay from 'src/components/transmission-display/transmission-display.component';
import MapInfoDisplay from 'src/components/map-info-display/map-info-display.component';
import AccelerationOverTimeDisplay from 'src/components/acceleration-over-time-display/acceleration-over-time-display.component';
import BrakePressureDisplay from 'src/components/brake-pressure-display/brake-pressure-display.component';
import { SidebarModule } from 'primeng/sidebar';
import AppSidebar from './app-sidebar/app-sidebar.component';
import SidebarChip from 'src/components/sidebar-chip/sidebar-chip.component';
import SidebarToggle from 'src/components/sidebar-toggle/sidebar-toggle.component';
import MotorInfo from 'src/components/motor-info/motor-info.component';
import LandingPageMobile from 'src/pages/landing-page/landing-page-mobile/landing-page-mobile.component';
import RaspberryPiDesktop from 'src/components/raspberry-pi/raspberry-pi-desktop-content/raspberry-pi-desktop.component';
import RaspberryPiMobile from 'src/components/raspberry-pi/raspberry-pi-mobile-content/raspberry-pi-mobile.component';
import BatteryInfoDesktop from 'src/components/battery-components/battery-info-display/battery-info-desktop/battery-info-desktop.component';
import BatteryInfoMobile from 'src/components/battery-components/battery-info-display/battery-info-mobile/battery-info-mobile.component';
import BatteryStatusDisplay from 'src/components/battery-components/battery-status-display/battery-status-display.component';
import StateOfChargeDisplay from 'src/components/battery-components/state-of-charge/state-of-charge-display/state-of-charge-display.component';
import PackTemp from 'src/components/battery-components/pack-temp/pack-temp.component';
import CellTempDisplay from 'src/components/battery-components/cell-temp/cell-temp-display/cell-temp-display.component';
import CellTempGraph from 'src/components/battery-components/cell-temp/cell-temp-graph/cell-temp-graph.component';
import CurrentDisplay from 'src/components/battery-components/battery-current/current-display/current-display.component';
import FaultDisplay from 'src/components/battery-components/fault-display/fault-display.component';
import CurrentGraph from 'src/components/battery-components/battery-current/current-graph/current-graph.component';
import { SwitchComponent } from 'src/components/switch/switch.component';
import BMSModeDisplay from 'src/components/battery-components/BMS-mode/BMS-mode-display.component';
import { DoubleLineGraphComponent } from 'src/components/double-line-graph/double-line-graph.component';
import HighLowCellDisplay from 'src/components/battery-components/high-low-cell/high-low-cell-display/high-low-cell-display.component';
import HighLowCellGraph from 'src/components/battery-components/high-low-cell/high-low-cell-graph/high-low-cell-graph.component';
import PackVoltageGraph from 'src/components/battery-components/pack-voltage/pack-voltage-graph/pack-voltage-graph.component';
import PackVoltageDisplay from 'src/components/battery-components/pack-voltage/pack-voltage-display/pack-voltage-display.component';
import ChargingStateComponent from 'src/components/battery-components/charging-state/charging-state.component';

@NgModule({
  declarations: [
    AppContext,
    LandingPage,
    ChargingPage,
    ChargingPageMobile,
    GraphPage,
    GraphSidebar,
    GraphSidebarMobile,
    GraphSidebarDesktop,
    SidebarCard,
    Typography,
    LoadingPage,
    ErrorPage,
    Header,
    GraphHeader,
    BatteryPercentageComponent,
    MoreDetails,
    RunSelector,
    Carousel,
    ButtonComponent,
    GraphInfo,
    Graph,
    Map,
    InfoBackgroundComponent,
    CircularPercentageComponent,
    Thermometer,
    VStack,
    HStack,
    ResolutionSelector,
    LatencyDisplay,
    BatteryInfoDisplay,
    GraphComponent,
    InfoGraph,
    GraphDialog,
    Divider,
    DriverComponent,
    SteeringAngleDisplay,
    HalfGauge,
    Divider,
    PieChart,
    AccelerationGraphs,
    ViewerDisplay,
    ConnectionDisplay,
    SpeedDisplay,
    SpeedOverTimeDisplay,
    TorqueDisplay,
    TransmissionDisplay,
    MapInfoDisplay,
    AccelerationOverTimeDisplay,
    BrakePressureDisplay,
    RasberryPi,
    AccelerationGraphs,
    AppSidebar,
    SidebarChip,
    SidebarToggle,
    MotorInfo,
    LandingPageMobile,
    RaspberryPiDesktop,
    RaspberryPiMobile,
    BatteryInfoDesktop,
    BatteryInfoMobile,
    BatteryStatusDisplay,
    StateOfChargeDisplay,
    PackTemp,
    CellTempDisplay,
    CellTempGraph,
    CurrentDisplay,
    FaultDisplay,
    CurrentGraph,
    SwitchComponent,
    BMSModeDisplay,
    DoubleLineGraphComponent,
    HighLowCellDisplay,
    HighLowCellGraph,
    PackVoltageGraph,
    PackVoltageDisplay,
    ChargingStateComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CarouselModule,
    NgApexchartsModule,
    FlexLayoutModule,
    NgApexchartsModule,
    ToastModule,
    OrderListModule,
    ProgressSpinnerModule,
    MatIconModule,
    MatGridListModule,
    DynamicDialogModule,
    BrowserAnimationsModule,
    ButtonModule,
    HttpClientModule,
    MatIconModule,
    SidebarModule
  ],
  providers: [DialogService, MessageService],
  bootstrap: [AppContext]
})
export class AppModule {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.matIconRegistry.addSvgIcon(
      'steering_wheel',
      this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/search_hands_free.svg')
    );
  }
}
