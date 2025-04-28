import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { CarouselModule } from 'primeng/carousel';
import { ToastModule } from 'primeng/toast';
import { OrderListModule } from 'primeng/orderlist';
import LandingPageComponent from 'src/pages/landing-page/landing-page.component';
import ChargingPageComponent from 'src/pages/charging-page/charging-page.component';
import ChargingPageMobileComponent from 'src/pages/charging-page/charging-page-mobile/charging-page-mobile.component';
import GraphSidebarComponent from 'src/pages/graph-page/graph-sidebar/graph-sidebar.component';
import SidebarCardComponent from 'src/pages/graph-page/graph-sidebar/sidebar-card/sidebar-card.component';
import AppContextComponent from './context/app-context.component';
import GraphPageComponent from 'src/pages/graph-page/graph-page.component';
import TypographyComponent from 'src/components/typography/typography.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import HeaderComponent from 'src/components/header/header.component';
import GraphHeaderComponent from 'src/pages/graph-page/graph-header/graph-header.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import { CircularPercentageComponent } from 'src/components/circular-percentage/circular-percentage.component';
import MoreDetails from 'src/components/more-details/more-details.component';
import { RunSelectorComponent } from 'src/pages/graph-page/graph-caption/run-selector/run-selector.component';
import { CarouselComponent } from 'src/components/carousel/carousel.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import GraphInfoComponent from 'src/pages/graph-page/graph-caption/graph-caption.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import CustomGraphComponent from 'src/pages/graph-page/graph/graph.component';
import GraphSidebarMobileComponent from 'src/pages/graph-page/graph-sidebar/graph-sidebar-mobile/graph-sidebar-mobile.component';
import GraphSidebarDesktopComponent from 'src/pages/graph-page/graph-sidebar/graph-sidebar-desktop/graph-sidebar-desktop.component';
import MapComponent from 'src/pages/map/map.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { DialogService, DynamicDialog } from 'primeng/dynamicdialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { GraphComponent } from 'src/components/graph/graph.component';
import { InfoGraphComponent } from 'src/components/info-graph/info-graph.component';
import { GraphDialogComponent } from 'src/components/graph-dialog/graph-dialog.component';
import { SteeringAngleDisplayComponent } from 'src/components/steering-angle-display/steering-angle-display.component';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import HalfGaugeComponent from 'src/components/half-gauge/half-gauge.component';
import { DividerComponent } from 'src/components/divider/divider';
import { DriverComponent } from 'src/components/driver-component/driver-component';
import PieChartComponent from 'src/components/pie-chart/pie-chart.component';
import RasberryPiComponent from 'src/components/raspberry-pi/raspberry-pi.component';
import { AccelerationGraphsComponent } from 'src/components/acceleration-graphs/acceleration-graphs.component';
import SpeedDisplayComponent from 'src/components/speed-display/speed-display.component';
import SpeedOverTimeDisplayComponent from 'src/components/speed-over-time-display/speed-over-time-display.component';
import TorqueDisplayComponent from 'src/components/torque-display/torque-display.component';
import AccelerationOverTimeDisplayComponent from 'src/components/acceleration-over-time-display/acceleration-over-time-display.component';
import BrakePressureDisplayComponent from 'src/components/brake-pressure-display/brake-pressure-display.component';
import SidebarChipComponent from 'src/components/sidebar-chip/sidebar-chip.component';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import MotorInfoComponent from 'src/components/motor-info/motor-info.component';
import LandingPageMobileComponent from 'src/pages/landing-page/landing-page-mobile/landing-page-mobile.component';
import RaspberryPiDesktopComponent from 'src/components/raspberry-pi/raspberry-pi-desktop-content/raspberry-pi-desktop.component';
import RaspberryPiMobileComponent from 'src/components/raspberry-pi/raspberry-pi-mobile-content/raspberry-pi-mobile.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NodeFilterPipe } from 'src/utils/pipes/node-filter.pipe';
import { SwitchComponent } from 'src/components/switch/switch.component';
import { DoubleLineGraphComponent } from 'src/components/double-line-graph/double-line-graph.component';
import BatteryInfoDesktopComponent from 'src/pages/charging-page/components/battery-info-display/battery-info-desktop/battery-info-desktop.component';
import BatteryInfoMobileComponent from 'src/pages/charging-page/components/battery-info-display/battery-info-mobile/battery-info-mobile.component';
import StateOfChargeDisplayComponent from 'src/pages/charging-page/components/state-of-charge/state-of-charge-display/state-of-charge-display.component';
import PackTempComponent from 'src/pages/charging-page/components/pack-temp/pack-temp.component';
import CellTempDisplayComponent from 'src/pages/charging-page/components/cell-temp/cell-temp-display/cell-temp-display.component';
import CellTempGraphComponent from 'src/pages/charging-page/components/cell-temp/cell-temp-graph/cell-temp-graph.component';
import CurrentDisplayComponent from 'src/pages/charging-page/components/battery-current/current-display/current-display.component';
import FaultDisplayComponent from 'src/pages/charging-page/components/fault-display/fault-display.component';
import BMSModeDisplayComponent from 'src/pages/charging-page/components/BMS-mode/BMS-mode-display.component';
import HighLowCellDisplayComponent from 'src/pages/charging-page/components/high-low-cell/high-low-cell-display/high-low-cell-display.component';
import HighLowCellGraphComponent from 'src/pages/charging-page/components/high-low-cell/high-low-cell-graph/high-low-cell-graph.component';
import PackVoltageGraphComponent from 'src/pages/charging-page/components/pack-voltage/pack-voltage-graph/pack-voltage-graph.component';
import PackVoltageDisplayComponent from 'src/pages/charging-page/components/pack-voltage/pack-voltage-display/pack-voltage-display.component';
import ChargingStatusComponent from 'src/pages/charging-page/components/charging-state/charging-status.component';
import { BatteryPercentageComponent } from 'src/components/battery-percentage/battery-percentage.component';
import { BatteryInfoDisplayComponent } from 'src/pages/charging-page/components/battery-info-display/battery-info-display';
import { ToastButtonComponent } from 'src/components/toast-button/toast-button.component';
import StartingSocTimerComponent from 'src/pages/charging-page/components/starting-soc/starting-soc-timer.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import BalancingStatusComponent from 'src/pages/charging-page/components/balancing-status/balancing-status.component';
import FaultedStatusComponent from 'src/pages/charging-page/components/faulted-status/faulted-status.component';
import ActiveStatusComponent from 'src/pages/charging-page/components/active-status/active-status.component';
import CombinedStatusDisplayComponent from 'src/pages/charging-page/components/combined-status-display/combined-status-display.component';
import CombinedStatusMobileComponent from 'src/pages/charging-page/components/combined-status-display/mobile-view/combined-status-mobile.component';
import PackVoltageMobileDisplayComponent from 'src/pages/charging-page/components/pack-voltage/pack-voltage-display/pack-voltage-mobile/pack-voltage-mobile.component';
import HighLowCellMobileComponent from 'src/pages/charging-page/components/high-low-cell/high-low-cell-display/high-low-cell-mobile/high-low-cell-mobile.component';
import CellTempMobileComponent from 'src/pages/charging-page/components/cell-temp/cell-temp-display/cell-temp-mobile/cell-temp-mobile.component';
import ConnectionDisplayComponent from 'src/pages/landing-page/components/connection-display/connection-display.component';
import { CurrentRunDisplayComponent } from 'src/pages/landing-page/components/current-run-display/current-run-display.component';
import LatencyDisplayComponent from 'src/components/latency-display/latency-display';
import { DateLocationComponent } from 'src/pages/landing-page/components/date-location-display/date-location.component';
import { ViewerDisplayComponent } from 'src/pages/landing-page/components/viewer-display/viewer-display.component';
import NodeDisplayComponent from 'src/pages/graph-page/graph-sidebar/node-display/node-display.component';
import { AppNavBarComponent } from './app-nav-bar/app-nav-bar.component';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SidebarModule } from 'primeng/sidebar';
import { BmsDebugPageComponent } from 'src/pages/bms-debug-page/bms-debug-page.component';
import { BmsAtAGlanceComponent } from 'src/pages/bms-debug-page/components/bms-at-a-glance/bms-at-a-glance.component';
import { SegmentSummaryComponent } from 'src/pages/bms-debug-page/components/segment-summary/segment-summary.component';
import { SegmentSelectorComponent } from 'src/pages/bms-debug-page/components/segment-selector/segment-selector.component';
import { CRCComponent } from 'src/pages/bms-debug-page/components/crc/crc.component';
import { AccHighTempComponent } from 'src/pages/bms-debug-page/components/acc-high-temp/acc-high-temp.component';
import { AccLowVoltageComponent } from 'src/pages/bms-debug-page/components/acc-low-voltage/acc-low-voltage.component';
import { AccHighVoltageComponent } from 'src/pages/bms-debug-page/components/acc-high-voltage/acc-high-voltage.component';
import { BmsOverflowComponent } from 'src/pages/bms-debug-page/components/bms-overflow/bms-overflow.component';
import { InfoValueDisplayComponent } from 'src/components/info-value-dispaly/info-value-display.component';
import { SelectDropdownComponent } from 'src/components/select-dropdown/select-dropdown.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SelectModule } from 'primeng/select';
import { providePrimeNG } from 'primeng/config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import Lara from '@primeng/themes/aura';
import FaultPageComponent from 'src/pages/fault-page/fault-page.component';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { TreeModule } from 'primeng/tree';
import { BmsHeaderComponent } from 'src/pages/bms-debug-page/components/bms-header/bms-header.component';
import { ConnectionDotWithMessageComponent } from 'src/components/connection-dot-with-message/connection-dot-with-message.component';
import { GeneralButtonsComponent } from 'src/pages/graph-page/graph-caption/general-buttons/general-buttons.component';
import { FaultDisplayInfoComponent } from 'src/pages/graph-page/graph-caption/fault-display-info/fault-display-info.component';
import { FaultButtonsComponent } from 'src/pages/graph-page/graph-caption/fault-buttons/fault-buttons.component';
import { GeneralDisplayInfoComponent } from 'src/pages/graph-page/graph-caption/general-display-info/general-display-info.component';
import { CameraPageComponent } from 'src/pages/camera-page/camera-page.component';
import { BmsSegmentViewComponent } from 'src/pages/bms-debug-page/bms-segment-view/bms-segment-view.component';
import { SegmentAtAGlanceComponent } from 'src/pages/bms-debug-page/components/segment-at-a-glance/segment-at-a-glance.component';
import { CellByCellHeatMapComponent } from 'src/pages/bms-debug-page/components/cell-by-cell-heat-map/cell-by-cell-heat-map.component';
import { CellViewComponent } from 'src/pages/bms-debug-page/components/cell-view/cell-view.component';
import { ChipDiagnosticsComponent } from 'src/pages/bms-debug-page/components/chip-diagnostics/chip-diagnostics.component';
import { ChipFaultsComponent } from 'src/pages/bms-debug-page/components/chip-faults/chip-faults.component';
import { CellTileComponent } from 'src/pages/bms-debug-page/components/cell-by-cell-heat-map/cell-tile/cell-tile.component';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { FormTemplateComponent } from 'src/components/form-template/form-template.component';
import { RunFormComponent } from 'src/components/run-form/run-form.component';
import CarCommandComponent from 'src/pages/car-command-page/car-command.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';

@NgModule({
  declarations: [
    AppContextComponent,
    LandingPageComponent,
    ChargingPageComponent,
    ChargingPageMobileComponent,
    GraphPageComponent,
    GraphSidebarComponent,
    GraphSidebarMobileComponent,
    GraphSidebarDesktopComponent,
    SidebarCardComponent,
    TypographyComponent,
    LoadingPageComponent,
    ErrorPageComponent,
    HeaderComponent,
    GraphHeaderComponent,
    BatteryPercentageComponent,
    MoreDetails,
    RunSelectorComponent,
    CarouselComponent,
    ButtonComponent,
    GraphInfoComponent,
    CustomGraphComponent,
    MapComponent,
    InfoBackgroundComponent,
    CircularPercentageComponent,
    ThermometerComponent,
    VStackComponent,
    HStackComponent,
    BatteryInfoDisplayComponent,
    GraphComponent,
    InfoGraphComponent,
    GraphDialogComponent,
    DividerComponent,
    DriverComponent,
    SteeringAngleDisplayComponent,
    HalfGaugeComponent,
    DividerComponent,
    PieChartComponent,
    AccelerationGraphsComponent,
    ViewerDisplayComponent,
    SpeedDisplayComponent,
    SpeedOverTimeDisplayComponent,
    TorqueDisplayComponent,
    AccelerationOverTimeDisplayComponent,
    BrakePressureDisplayComponent,
    RasberryPiComponent,
    AccelerationGraphsComponent,
    SidebarChipComponent,
    SidebarToggleComponent,
    MotorInfoComponent,
    LandingPageMobileComponent,
    RaspberryPiDesktopComponent,
    RaspberryPiMobileComponent,
    BatteryInfoDesktopComponent,
    BatteryInfoMobileComponent,
    NodeFilterPipe,
    ChipFaultPipe,
    CombinedStatusDisplayComponent,
    StateOfChargeDisplayComponent,
    PackTempComponent,
    CellTempDisplayComponent,
    CellTempGraphComponent,
    CurrentDisplayComponent,
    FaultDisplayComponent,
    SwitchComponent,
    BMSModeDisplayComponent,
    DoubleLineGraphComponent,
    HighLowCellDisplayComponent,
    HighLowCellGraphComponent,
    PackVoltageGraphComponent,
    PackVoltageDisplayComponent,
    ToastButtonComponent,
    ChargingStatusComponent,
    StartingSocTimerComponent,
    CurrentTotalTimerComponent,
    BalancingStatusComponent,
    FaultedStatusComponent,
    ActiveStatusComponent,
    CombinedStatusMobileComponent,
    PackVoltageMobileDisplayComponent,
    HighLowCellMobileComponent,
    CellTempMobileComponent,
    ConnectionDisplayComponent,
    LatencyDisplayComponent,
    DateLocationComponent,
    CurrentRunDisplayComponent,
    ViewerDisplayComponent,
    NodeDisplayComponent,
    AppNavBarComponent,
    BmsDebugPageComponent,
    BmsAtAGlanceComponent,
    SegmentSummaryComponent,
    SegmentSelectorComponent,
    CRCComponent,
    AccHighTempComponent,
    AccLowVoltageComponent,
    AccHighVoltageComponent,
    BmsOverflowComponent,
    InfoValueDisplayComponent,
    SelectDropdownComponent,
    FaultPageComponent,
    BmsHeaderComponent,
    ConnectionDotWithMessageComponent,
    GeneralButtonsComponent,
    FaultButtonsComponent,
    GeneralDisplayInfoComponent,
    FaultDisplayInfoComponent,
    CameraPageComponent,
    BmsSegmentViewComponent,
    SegmentAtAGlanceComponent,
    CellViewComponent,
    CellByCellHeatMapComponent,
    ChipDiagnosticsComponent,
    ChipFaultsComponent,
    CellTileComponent,
    FormTemplateComponent,
    RunFormComponent,
    CarCommandComponent
  ],
  bootstrap: [AppContextComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CarouselModule,
    NgApexchartsModule,
    NgApexchartsModule,
    ToastModule,
    OrderListModule,
    ProgressSpinnerModule,
    MatIconModule,
    MatGridListModule,
    DynamicDialog,
    BrowserAnimationsModule,
    ButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    SidebarModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    SelectModule,
    AccordionModule,
    TableModule,
    TreeModule,
    InputTextModule,
    InputNumberModule,
    PasswordModule
  ],
  providers: [
    DialogService,
    MessageService,
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Lara
      }
    })
  ]
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
      )
      .addSvgIcon('action_key', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/action_key.svg'))
      .addSvgIcon('apps', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/apps.svg'))
      .addSvgIcon(
        'battery_charging_2',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/battery_charging_2.svg')
      )
      .addSvgIcon('error', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/alert-triangle.svg'))
      .addSvgIcon('linked_camera', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/linked_camera.svg'));
  }
}
