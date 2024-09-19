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
import SidebarCard from 'src/pages/graph-page/graph-sidebar/sidebar-card/sidebar-card.component';
import AppContext from './context/app-context.component';
import GraphPage from 'src/pages/graph-page/graph-page.component';
import Typography from 'src/components/typography/typography.component';
import LoadingPage from 'src/components/loading-page/loading-page.component';
import ErrorPage from 'src/components/error-page/error-page.component';
import Header from 'src/components/header/header.component';
import GraphHeader from 'src/pages/graph-page/graph-header/graph-header.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import { CircularPercentageComponent } from 'src/components/circular-percentage/circular-percentage.component';
import MoreDetails from 'src/components/more-details/more-details.component';
import { RunSelector } from 'src/pages/graph-page/graph-caption/run-selector/run-selector.component';
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
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { NodeFilterPipe } from 'src/utils/pipes/node-filter-pipe';
import { DataTypeFilterPipe } from 'src/utils/pipes/data-type-filter-pipe';
import { SwitchComponent } from 'src/components/switch/switch.component';
import { DoubleLineGraphComponent } from 'src/components/double-line-graph/double-line-graph.component';
import BatteryInfoDesktop from 'src/pages/charging-page/components/battery-info-display/battery-info-desktop/battery-info-desktop.component';
import BatteryInfoMobile from 'src/pages/charging-page/components/battery-info-display/battery-info-mobile/battery-info-mobile.component';
import StateOfChargeDisplay from 'src/pages/charging-page/components/state-of-charge/state-of-charge-display/state-of-charge-display.component';
import PackTemp from 'src/pages/charging-page/components/pack-temp/pack-temp.component';
import CellTempDisplay from 'src/pages/charging-page/components/cell-temp/cell-temp-display/cell-temp-display.component';
import CellTempGraph from 'src/pages/charging-page/components/cell-temp/cell-temp-graph/cell-temp-graph.component';
import CurrentDisplay from 'src/pages/charging-page/components/battery-current/current-display/current-display.component';
import FaultDisplay from 'src/pages/charging-page/components/fault-display/fault-display.component';
import BMSModeDisplay from 'src/pages/charging-page/components/BMS-mode/BMS-mode-display.component';
import HighLowCellDisplay from 'src/pages/charging-page/components/high-low-cell/high-low-cell-display/high-low-cell-display.component';
import HighLowCellGraph from 'src/pages/charging-page/components/high-low-cell/high-low-cell-graph/high-low-cell-graph.component';
import PackVoltageGraph from 'src/pages/charging-page/components/pack-voltage/pack-voltage-graph/pack-voltage-graph.component';
import PackVoltageDisplay from 'src/pages/charging-page/components/pack-voltage/pack-voltage-display/pack-voltage-display.component';
import ChargingStatusComponent from 'src/pages/charging-page/components/charging-state/charging-status.component';
import { BatteryPercentageComponent } from 'src/pages/charging-page/components/battery-percentage/battery-percentage.component';
import { BatteryInfoDisplay } from 'src/pages/charging-page/components/battery-info-display/battery-info-display';
import StartingSocTimer from 'src/pages/charging-page/components/starting-soc/starting-soc-timer.component';
import CurrentTotalTimer from 'src/components/current-total-timer/current-total-timer.component';
import BalancingStatus from 'src/pages/charging-page/components/balancing-status/balancing-status.component';
import FaultedStatus from 'src/pages/charging-page/components/faulted-status/faulted-status.component';
import ActiveStatus from 'src/pages/charging-page/components/active-status/active-status.component';
import CombinedStatusDisplay from 'src/pages/charging-page/components/combined-status-display/combined-status-display.component';
import CombinedStatusMobile from 'src/pages/charging-page/components/combined-status-display/mobile-view/combined-status-mobile.component';
import PackVoltageMobileDisplay from 'src/pages/charging-page/components/pack-voltage/pack-voltage-display/pack-voltage-mobile/pack-voltage-mobile.component';
import HighLowCellMobile from 'src/pages/charging-page/components/high-low-cell/high-low-cell-display/high-low-cell-mobile/high-low-cell-mobile.component';
import CellTempMobile from 'src/pages/charging-page/components/cell-temp/cell-temp-display/cell-temp-mobile/cell-temp-mobile.component';

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
    NodeFilterPipe,
    DataTypeFilterPipe,
    CombinedStatusDisplay,
    StateOfChargeDisplay,
    PackTemp,
    CellTempDisplay,
    CellTempGraph,
    CurrentDisplay,
    FaultDisplay,
    SwitchComponent,
    BMSModeDisplay,
    DoubleLineGraphComponent,
    HighLowCellDisplay,
    HighLowCellGraph,
    PackVoltageGraph,
    PackVoltageDisplay,
    ChargingStatusComponent,
    StartingSocTimer,
    CurrentTotalTimer,
    BalancingStatus,
    FaultedStatus,
    ActiveStatus,
    CombinedStatusMobile,
    PackVoltageMobileDisplay,
    HighLowCellMobile,
    CellTempMobile
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
    SidebarModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  providers: [DialogService, MessageService],
  bootstrap: [AppContext]
})
export class AppModule {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.matIconRegistry
      .addSvgIcon(
        'steering_wheel',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/search_hands_free.svg')
      )
      .addSvgIcon('wifi', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/wifi.svg'))
      .addSvgIcon('speed', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/speed.svg'))
      .addSvgIcon('person', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/person.svg'))
      .addSvgIcon('eye', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/eye_tracking.svg'))
      .addSvgIcon('timelapse', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/timelapse.svg'))
      .addSvgIcon('cell_tower', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/cell_tower.svg'))
      .addSvgIcon('map', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/map.svg'))
      .addSvgIcon('360', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/360.svg'))
      .addSvgIcon('electric_car', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/electric_car.svg'))
      .addSvgIcon('memory', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/memory.svg'))
      .addSvgIcon('back_hand', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/back_hand.svg'))
      .addSvgIcon(
        'battery_charging_full',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/battery_charging_full.svg')
      )
      .addSvgIcon('menu', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/menu.svg'))
      .addSvgIcon('home', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/home.svg'))
      .addSvgIcon('bar_chart', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/bar_chart.svg'))
      .addSvgIcon('search', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/search.svg'))
      .addSvgIcon('arrow_right', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/arrow_right.svg'))
      .addSvgIcon('ev_station', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/ev_station.svg'))
      .addSvgIcon(
        'device_thermostat',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/device_thermostat.svg')
      )
      .addSvgIcon('electric_meter', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/electric_meter.svg'))
      .addSvgIcon('warning', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/warning.svg'))
      .addSvgIcon(
        'electrical_services',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/electrical_services.svg')
      )
      .addSvgIcon('thermostat', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/thermostat.svg'))
      .addSvgIcon('model_training', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/model_training.svg'))
      .addSvgIcon('quickreply', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/quickreply.svg'))
      .addSvgIcon('bolt', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/bolt.svg'))
      .addSvgIcon('timer', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/timer.svg'))
      .addSvgIcon(
        'arrow_drop_down_circle',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assests/icons/arrow_drop_down_circle.svg')
      );
  }
}
